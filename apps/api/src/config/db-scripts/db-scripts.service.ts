import { Injectable, Logger, OnApplicationBootstrap, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron'; // OK usar este, mas veremos o cast ao adicionar
import { Prisma, DbScript, ScriptRunStatus, ScriptScheduleType } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';

type RunFilters = {
  initialDate?: string; // "YYYY-MM-DD"
  finalDate?: string;   // "YYYY-MM-DD"
  status?: 'SUCCESS' | 'ERROR' | 'RUNNING' | 'ALL' | string | undefined;
};

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

  private parseYmdStart(s?: string): Date | undefined {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? undefined : d;
  }

  private nextDayUTC(d: Date): Date {
    return new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }

  private normalizeStatus(input?: string): ScriptRunStatus | undefined {
    if (!input) return undefined;
    const wanted = input.toString().trim();
    if (!wanted) return undefined;

    // match case-insensitive contra os valores reais do enum
    const allowed = Object.values(ScriptRunStatus); // ex.: ["SUCCESS","ERROR","RUNNING",...]
    const match = allowed.find(v => v.toUpperCase() === wanted.toUpperCase());
    return match as ScriptRunStatus | undefined;
  }

  private buildWhere(scriptId: number, filters?: RunFilters): Prisma.DbScriptRunWhereInput {
    const where: Prisma.DbScriptRunWhereInput = { scriptId };

    if (filters) {
      const start = this.parseYmdStart(filters.initialDate);
      const endStart = this.parseYmdStart(filters.finalDate);

      if (start && endStart) {
        where.startedAt = { gte: start, lt: this.nextDayUTC(endStart) };
      } else if (start) {
        where.startedAt = { gte: start };
      } else if (endStart) {
        where.startedAt = { lt: this.nextDayUTC(endStart) };
      }

      const st = this.normalizeStatus(filters.status);
      if (st) {
        where.status = st; // agora é ScriptRunStatus de verdade
      }
    }

    return where;
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
   * Se page/pageSize não forem passados, retorna até 200 itens (modo simples).
   */
  async listRuns(scriptId: number, page?: number, pageSize?: number, filters?: RunFilters) {
    const where = this.buildWhere(scriptId, filters);

    if (!page || !pageSize) {
      return this.prisma.dbScriptRun.findMany({
        where,
        orderBy: { id: 'desc' },
        take: 200,
      });
    }

    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.dbScriptRun.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.dbScriptRun.count({ where }),
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
        // NEW: buffer de notices
        const notices: string[] = [];
        const onNotice = (msg: any) => {
          // msg: NoticeMessage (tem message, severity, detail, hint, position, etc.)
          const parts = [`[${msg.severity}] ${msg.message}`];
          if (msg.detail) parts.push(`detail: ${msg.detail}`);
          if (msg.hint) parts.push(`hint: ${msg.hint}`);
          notices.push(parts.join(' | '));
        };
        (client as any).on?.('notice', onNotice);

        const timeoutMs = Math.max(1000, (script.timeoutSec ?? 600) * 1000);

        try {
          // advisory lock (como já está)
          const lockRes = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [LOCK_NS, script.id]);
          const locked = !!lockRes.rows?.[0]?.locked;
          if (!locked) {
            status = 'SKIPPED' as ScriptRunStatus;
            error = 'Another instance is running this script.';
            wasSkipped = true;
            return;
          }

          // NEW: garantir que INFO/NOTICE chegue ao cliente
          // (INFO captura também RAISE INFO; com NOTICE já seria suficiente pro seu exemplo)
          if (script.wrapInTransaction) {
            await client.query('BEGIN');
            await client.query(`SET LOCAL client_min_messages = 'INFO'`);
            await client.query(`SET LOCAL statement_timeout = ${timeoutMs}`);
          } else {
            await client.query(`SET client_min_messages = 'INFO'`);
            await client.query(`SET statement_timeout = ${timeoutMs}`);
          }

          // search_path (como já está)
          if (script.searchPath) {
            await client.query(`SET search_path TO ${quoteIdentList(script.searchPath)}`);
          }

          const t0 = Date.now();

          try {
            const res = await client.query(script.sqlText);
            rowsAffected = (res as any)?.rowCount ?? null;
            status = 'SUCCESS';
            if (script.wrapInTransaction) await client.query('COMMIT');
          } catch (e) {
            if (script.wrapInTransaction) { try { await client.query('ROLLBACK'); } catch {} }
            throw e;
          } finally {
            // RESET quando não está em transação
            if (!script.wrapInTransaction) {
              try { await client.query('RESET statement_timeout'); } catch {}
              try { await client.query('RESET client_min_messages'); } catch {}
            }
          }

          const durationMs = Date.now() - t0;

          // NEW: salva o log de notices (truncado para evitar payloads gigantes)
          const MAX = 15000;
          const logTxt = notices.join('\n');
          const log = logTxt.length > MAX ? (logTxt.slice(0, MAX) + '\n... (truncated)') : logTxt;

          await this.prisma.dbScriptRun.update({
            where: { id: run.id },
            data: { status, finishedAt: new Date(), durationMs, rowsAffected, log },
          });

          await this.prisma.dbScript.update({
            where: { id: script.id },
            data: { lastStatus: status, latestRunAt: new Date() },
          });

          // unlock
          try { await client.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_NS, script.id]); } catch {}
        } finally {
          // NEW: remover listener para não vazar
          try { (client as any).off?.('notice', onNotice); } catch {}
        }
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
