import { Injectable, Logger, OnApplicationBootstrap, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'; // OK usar este, mas veremos o cast ao adicionar
import { Prisma, DbScript, ScriptRunStatus, ScriptScheduleType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';

const LOCK_NS = 763_812; // namespace inteiro para o pg_advisory_lock

@Injectable()
export class DbScriptsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbScriptsService.name);
  private readonly instanceId = `${process.env.HOSTNAME ?? 'host'}:${process.pid}`;
  private runningLocal = new Set<number>(); // evita sobreposição local por script

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerRegistry,
    private readonly pg: PgService,
  ) {}

  async onApplicationBootstrap() {
    await this.loadAndRegisterAll();
  }

  // ===== Scheduling =====
  async loadAndRegisterAll() {
    const scripts = await this.prisma.dbScript.findMany({ where: { enabled: true } });

    // limpa jobs antigos (hot-reload / re-registro)
    // Usar forEach nos Maps evita inferências estranhas de tipo (ex.: number)
    const cronJobs = this.scheduler.getCronJobs();
    cronJobs.forEach((_job, key) => {
      if (key.startsWith('dbscript:')) {
        this.scheduler.deleteCronJob(key);
      }
    });

    const intervals = this.scheduler.getIntervals() as unknown as Map<string, any>;
    intervals.forEach((_ref, key) => {
      if (key.startsWith('dbscript:')) {
        this.scheduler.deleteInterval(key);
      }
    });

    for (const s of scripts) await this.registerScriptJob(s);
    this.logger.log(`Registered ${scripts.length} DB script job(s).`);
  }

  private jobName(id: number) {
    return `dbscript:${id}`;
  }

  async registerScriptJob(script: DbScript) {
    const name = this.jobName(script.id);
    try { this.scheduler.deleteCronJob(name); } catch {}
    try { this.scheduler.deleteInterval(name); } catch {}

    if (!script.enabled) return;

    if (script.scheduleType === ScriptScheduleType.INTERVAL && script.intervalSeconds) {
      const ms = Math.max(1000, script.intervalSeconds * 1000);
      const ref = setInterval(() => this.safeRun(script.id), ms);
      this.scheduler.addInterval(name, ref);
      this.logger.log(`Interval job registered: ${name} every ${script.intervalSeconds}s`);
      return;
    }

    if (script.scheduleType === ScriptScheduleType.CRON && script.cronExpression) {
      // Atenção: @nestjs/schedule pode carregar sua própria cópia de 'cron',
      // causando mismatch de tipos. Usamos cast para evitar erro de tipagem.
      const job: any = new CronJob(
        script.cronExpression,
        () => this.safeRun(script.id),
        null,
        false,
        script.timezone || 'America/Sao_Paulo',
      );
      (this.scheduler as any).addCronJob(name, job);
      job.start();
      this.logger.log(`Cron job registered: ${name} @ ${script.cronExpression} (${script.timezone})`);
      return;
    }

    this.logger.warn(`Script ${script.id} has an invalid schedule; not registered.`);
  }

  async unregisterScriptJob(scriptId: number) {
    const name = this.jobName(scriptId);
    try { this.scheduler.deleteCronJob(name); } catch {}
    try { this.scheduler.deleteInterval(name); } catch {}
  }

  async reschedule(scriptId: number) {
    const script = await this.prisma.dbScript.findUnique({ where: { id: scriptId } });
    if (!script) return;
    await this.registerScriptJob(script);
  }

  // ===== CRUD helpers =====
  list() {
    return this.prisma.dbScript.findMany({ orderBy: { id: 'desc' } });
  }

  /**
   * Lista execuções (runs) de um script.
   * @param scriptId
   * @param page página 1-based (opcional)
   * @param pageSize itens por página (opcional)
   * Se page/pageSize não forem passados, usa take=200 (compatível com o que você tinha).
   */
  async listRuns(scriptId: number, page?: number, pageSize?: number) {
    if (!page || !pageSize) {
      // modo simples (compatível com o código atual)
      return this.prisma.dbScriptRun.findMany({
        where: { scriptId },
        orderBy: { id: 'desc' },
        take: 200,
      });
    }

    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.dbScriptRun.findMany({
        where: { scriptId },
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.dbScriptRun.count({ where: { scriptId } }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  get(id: number) {
    return this.prisma.dbScript.findUnique({ where: { id } });
  }

  async create(data: Prisma.DbScriptCreateInput) {
    const created = await this.prisma.dbScript.create({ data });
    await this.registerScriptJob(created);
    return created;
  }

  async update(id: number, data: Prisma.DbScriptUpdateInput) {
    const updated = await this.prisma.dbScript.update({ where: { id }, data });
    await this.registerScriptJob(updated);
    return updated;
  }

  async enable(id: number) {
    const updated = await this.prisma.dbScript.update({ where: { id }, data: { enabled: true } });
    await this.registerScriptJob(updated);
    return updated;
  }

  async disable(id: number) {
    const updated = await this.prisma.dbScript.update({ where: { id }, data: { enabled: false } });
    await this.unregisterScriptJob(id);
    return updated;
  }

  // ===== Execution (public wrappers) =====
  async runScript(scriptId: number, source: 'SCHEDULE' | 'MANUAL' | 'RETRY', reason?: string) {
    await this.executeScript(scriptId, source, reason);
  }

  private async safeRun(scriptId: number) {
    try {
      await this.executeScript(scriptId, 'SCHEDULE');
    } catch (e: any) {
      this.logger.error(`Unhandled error running script ${scriptId}: ${e?.message ?? e}`);
    }
  }

  // ===== Core execution (com Pool) =====
  private async executeScript(scriptId: number, source: 'SCHEDULE' | 'MANUAL' | 'RETRY', reason?: string) {
    const script = await this.prisma.dbScript.findUnique({ where: { id: scriptId } });
    if (!script || !script.enabled) return;

    // evita sobreposição local (mesma instância) para o mesmo script
    if (this.runningLocal.has(scriptId)) {
      await this.prisma.dbScriptRun.create({
        data: {
          scriptId,
          status: 'SKIPPED',
          triggeredBy: source,
          appInstanceId: this.instanceId,
          error: 'Already running in this instance.',
        },
      });
      return;
    }
    this.runningLocal.add(scriptId);

    const run = await this.prisma.dbScriptRun.create({
      data: {
        scriptId: script.id,
        status: 'SKIPPED',
        triggeredBy: source,
        appInstanceId: this.instanceId,
      },
    });

    const startedAt = new Date();
    let status: ScriptRunStatus = 'FAILED' as ScriptRunStatus; // inicial
    let rowsAffected: number | null = null;
    let error: string | null = null;
    let wasSkipped = false; // <- evita o falso-positivo de comparação de literais

    try {
      await this.pg.withClient(async (client) => {
        // Tenta adquirir o advisory lock para evitar concorrência entre instâncias
        const lockRes = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [LOCK_NS, script.id]);
        const locked = !!lockRes.rows?.[0]?.locked;
        if (!locked) {
          status = 'SKIPPED' as ScriptRunStatus;
          error = 'Another instance is running this script.';
          wasSkipped = true;
          return;
        }

        // search_path (opcional)
        if (script.searchPath) {
          await client.query(`SET search_path TO ${quoteIdentList(script.searchPath)}`);
        }

        const timeoutMs = Math.max(1000, (script.timeoutSec ?? 600) * 1000);
        const t0 = Date.now();

        if (script.wrapInTransaction) {
          // Transação + SET LOCAL (timeout vale só dentro da tx)
          await client.query('BEGIN');
          await client.query(`SET LOCAL statement_timeout = ${timeoutMs}`);

          try {
            const res = await client.query(script.sqlText);
            rowsAffected = (res as any)?.rowCount ?? null;
            await client.query('COMMIT');
            status = 'SUCCESS';
          } catch (e) {
            try { await client.query('ROLLBACK'); } catch {}
            throw e;
          }
        } else {
          // Sem transação: SET/RESET para este client dedicado
          await client.query(`SET statement_timeout = ${timeoutMs}`);
          try {
            const res = await client.query(script.sqlText);
            rowsAffected = (res as any)?.rowCount ?? null;
            status = 'SUCCESS';
          } finally {
            try { await client.query('RESET statement_timeout'); } catch {}
          }
        }

        const durationMs = Date.now() - t0;
        await this.prisma.dbScriptRun.update({
          where: { id: run.id },
          data: { status, finishedAt: new Date(), durationMs, rowsAffected },
        });

        await this.prisma.dbScript.update({
          where: { id: script.id },
          data: { lastStatus: status, latestRunAt: new Date() },
        });

        // Sempre liberar o advisory lock
        try { await client.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_NS, script.id]); } catch {}
      });

      if (wasSkipped && error) {
        await this.prisma.dbScriptRun.update({
          where: { id: run.id },
          data: { status: 'SKIPPED', startedAt, finishedAt: new Date(), error },
        });
      }
    } catch (e: any) {
      error = (e?.message ?? String(e)).slice(0, 4000);
      this.logger.error(`Script ${scriptId} failed: ${error}`);

      await this.prisma.dbScriptRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), error },
      });
      await this.prisma.dbScript.update({
        where: { id: scriptId },
        data: { lastStatus: 'FAILED', latestRunAt: new Date() },
      });
    } finally {
      this.runningLocal.delete(scriptId);
    }
  }

  async delete(id: number) {
    const exists = await this.prisma.dbScript.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Script not found');

    // Para de agendar/rodar
    await this.unregisterScriptJob(id);
    this.runningLocal.delete(id);

    // deletamos explicitamente o histórico antes.
    await this.prisma.dbScript.delete({ where: { id } })

    this.logger.log(`DbScript ${id} deleted.`);
    return { ok: true };
  }
}

// Helper para search_path: 'public, my_schema' -> '"public", "my_schema"'
function quoteIdentList(searchPath: string) {
  return searchPath
    .split(',')
    .map((s) => `"${s.trim().replace(/"/g, '""')}"`)
    .join(', ');
}
