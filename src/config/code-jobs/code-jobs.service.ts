import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ModuleRef } from '@nestjs/core';
import { Prisma, ScriptRunStatus } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';
import { toPersistence } from 'src/config/db-scripts/schedule-builder';
import { SnkApiService } from 'src/snk-api/snk-api.service';
import { CodeJob, getDecoratedJobs, DecoratedJobEntry } from './code-job.decorator';
import { ParametersService } from 'src/config/parameters/parameters.service';
import { UpdateCodeJobDto } from './dto/update-code-job.dto';
import { StoresService } from 'src/config/stores/stores.service';
import { CostCentersService } from 'src/adm/cost-centers/cost-centers.service';
import { DepartmentsService } from 'src/adm/departments/departments.service';

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { google, drive_v3 } from 'googleapis';

const execFileAsync = promisify(execFile);

const LOCK_NS = 764_001; // namespace para pg_advisory_lock
type RunFilters = {
  initialDate?: string; // "YYYY-MM-DD"
  finalDate?: string;   // "YYYY-MM-DD"
  status?: 'SUCCESS' | 'ERROR' | 'RUNNING' | 'ALL' | string | undefined;
};

@Injectable()
export class CodeJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CodeJobsService.name);
  private decorated!: DecoratedJobEntry[];
  private validHandlers!: Set<string>;

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly pg: PgService,
    private readonly moduleRef: ModuleRef,
    private readonly snk: SnkApiService,
    private readonly parameters: ParametersService,
    private readonly stores: StoresService,
    private readonly costCenters: CostCentersService,
    private readonly departments: DepartmentsService
  ) {}

  // ===== Lifecycle =====
  async onApplicationBootstrap() {
    // captura todos os métodos anotados
    this.decorated = getDecoratedJobs();
    this.validHandlers = new Set(this.decorated.map(d => d.handler));

    // cria/alinha jobs no banco (sem sobrescrever agendamento/enabled do usuário),
    // mas agora também faz BACKFILL de agendamento quando não houver nenhum.
    await this.ensureJobsFromDecorators();

    // registra no scheduler somente os válidos e habilitados
    await this.reloadSchedules();
  }

  // ===== Listar apenas jobs decorados =====
  async list() {
    return this.prisma.codeJob.findMany({
      where: { handler: { in: Array.from(this.validHandlers) } },
      orderBy: [{ enabled: 'desc' }, { name: 'asc' }],
    });
  }

    // ===== Atualizar (schedule/enabled) =====
    async update(id: number, dto?: UpdateCodeJobDto) {
        dto = dto ?? {};

        const job = await this.prisma.codeJob.findUnique({ where: { id } });
        if (!job) throw new NotFoundException('Job não encontrado.');
        if (!this.validHandlers.has(job.handler)) {
            throw new ForbiddenException('Job não é gerenciado por código.');
        }

        const data: Prisma.CodeJobUpdateInput = {};

        // --- enabled: aceita boolean, "true"/"false", 1/0, "1"/"0"
        if (dto.enabled !== undefined) {
            const v = dto.enabled;
            const enabled = v === true
            data.enabled = enabled;
        }

        // --- detecção de intenção de mudar schedule (dois formatos)
        const hasNewShape =
            dto.scheduleType !== undefined || dto.cron || dto.interval || dto.dailyAt || dto.weeklyAt;

        const hasLegacyShape =
            typeof dto.cronExpression === 'string' || typeof dto.intervalSeconds === 'number';

        if (hasNewShape) {
            if (!dto.scheduleType) {
            throw new BadRequestException('scheduleType é obrigatório ao alterar agendamento.');
            }

            const scheduleConfig =
            dto.scheduleType === 'CRON' && dto.cron
                ? ({ type: 'CRON', cron: dto.cron.cron, timezone: dto.cron?.timezone } as const)
                : dto.scheduleType === 'INTERVAL' && dto.interval
                ? ({ type: 'INTERVAL', everySeconds: dto.interval.everySeconds } as const)
                : dto.scheduleType === 'DAILY_AT' && dto.dailyAt
                ? ({ type: 'DAILY_AT', time: dto.dailyAt.time, timezone: dto.dailyAt?.timezone } as const)
                : dto.scheduleType === 'WEEKLY_AT' && dto.weeklyAt
                ? ({ type: 'WEEKLY_AT', weekday: dto.weeklyAt.weekday, time: dto.weeklyAt.time, timezone: dto.weeklyAt?.timezone } as const)
                : null;

            if (!scheduleConfig) {
            throw new BadRequestException('Parâmetros do agendamento incompletos para o tipo informado.');
            }

            const p = toPersistence(scheduleConfig);
            (data as any).scheduleType = p.scheduleType;
            data.cronExpression = p.cronExpression;
            (data as any).intervalSeconds = p.intervalSeconds;
            (data as any).timezone = p.timezone ?? job.timezone ?? 'America/Sao_Paulo';
        } else if (hasLegacyShape) {
            // formato “legado” vindo do Swagger (cronExpression/intervalSeconds/timezone)
            if (typeof dto.cronExpression === 'string') {
            (data as any).scheduleType = 'CRON';
            data.cronExpression = dto.cronExpression;
            (data as any).intervalSeconds = null;
            if (dto.timezone) (data as any).timezone = dto.timezone;
            } else if (typeof dto.intervalSeconds === 'number') {
            (data as any).scheduleType = 'INTERVAL';
            (data as any).intervalSeconds = Math.max(1, Math.floor(dto.intervalSeconds));
            data.cronExpression = null;
            if (dto.timezone) (data as any).timezone = dto.timezone;
            } else {
            throw new BadRequestException('Informe "cronExpression" (string) ou "intervalSeconds" (number).');
            }
        } else {
            // sem mudança de schedule -> ok; pode ser apenas toggle do enabled
        }

        const updated = await this.prisma.codeJob.update({ where: { id }, data });

        // re-registra no scheduler
        await this.unregisterSingle(id);
        await this.registerSingle(id);

        return updated;
    }


  /**
   * Lista execuções (runs) de um script.
   * Se page/pageSize não forem passados, retorna até 200 itens (modo simples).
   */
  async listRuns(jobId: number, page?: number, pageSize?: number, filters?: RunFilters) {
    const where = this.buildWhere(jobId, filters);

    if (!page || !pageSize) {
      return this.prisma.codeJobRun.findMany({
        where,
        orderBy: { id: 'desc' },
        take: 200,
      });
    }

    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.codeJobRun.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.codeJobRun.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async runNow(id: number, reason?: string) {
    const job = await this.prisma.codeJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job não encontrado.');
    if (!this.validHandlers.has(job.handler)) {
      throw new ForbiddenException('Job não é gerenciado por código.');
    }
    return this.executeJob(job.id, 'MANUAL', reason);
  }

  // ===== Registro de agendamentos =====
  private async reloadSchedules() {
    const jobs = await this.prisma.codeJob.findMany({
      where: { handler: { in: Array.from(this.validHandlers) } },
    });

    for (const j of jobs) await this.unregisterSingle(j.id);

    // Registra apenas os HABILITADOS e com schedule válido
    for (const j of jobs) {
      if (!j.enabled) continue;
      if (!j.cronExpression && !j.intervalSeconds) {
        this.logger.warn(
          `Job ${j.id} (${j.name}) está habilitado mas sem schedule salvo; não será agendado.`,
        );
        continue;
      }
      await this.registerSingle(j.id);
    }
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

  private buildWhere(jobId: number, filters?: RunFilters): Prisma.CodeJobRunWhereInput {
      const where: Prisma.CodeJobRunWhereInput = { jobId };
  
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

  private async unregisterSingle(id: number) {
    const key = `code-job-${id}`;
    try { this.scheduler.deleteCronJob(key); } catch {}
    try { this.scheduler.deleteInterval(key); } catch {}
    try { this.scheduler.deleteTimeout(key); } catch {}
  }

  private async registerSingle(id: number) {
    const j = await this.prisma.codeJob.findUnique({ where: { id } });
    if (!j || !j.enabled) return;
    if (!this.validHandlers.has(j.handler)) return;

    const key = `code-job-${j.id}`;
    const run = () => this.safeRun(j.id);

    switch (j.scheduleType) {
      case 'CRON': {
        if (!j.cronExpression) {
          this.logger.warn(`Job ${j.id} (${j.name}) tipo=CRON sem cronExpression; ignorado.`);
          return;
        }
        const tz = j.timezone ?? 'America/Sao_Paulo';
        const cronJob = new CronJob(j.cronExpression, run, null, false, tz);
        this.scheduler.addCronJob(key, cronJob as any); // evitar mismatch de tipos entre libs
        cronJob.start();
        this.logger.log(`Agendado CRON job ${j.id} (${j.name}) -> "${j.cronExpression}" @ ${tz}`);
        break;
      }
      case 'INTERVAL': {
        if (!j.intervalSeconds) {
          this.logger.warn(`Job ${j.id} (${j.name}) tipo=INTERVAL sem intervalSeconds; ignorado.`);
          return;
        }
        const ms = j.intervalSeconds * 1000;
        const handle = setInterval(run, ms);
        this.scheduler.addInterval(key, handle as any);
        this.logger.log(`Agendado INTERVAL job ${j.id} (${j.name}) -> cada ${j.intervalSeconds}s`);
        break;
      }
      default:
        this.logger.warn(`Job ${j.id} (${j.name}) com scheduleType inesperado: ${j.scheduleType}`);
        break;
    }
  }

  private async safeRun(jobId: number) {
    try {
      await this.executeJob(jobId, 'SCHEDULE');
    } catch (e: any) {
      this.logger.error(`Erro não tratado no job ${jobId}: ${e?.message ?? e}`);
    }
  }

  // ===== Execução com lock + log =====
  private async executeJob(
    jobId: number,
    source: 'SCHEDULE' | 'MANUAL' | 'RETRY',
    reason?: string,
  ) {
    const job = await this.prisma.codeJob.findUnique({ where: { id: jobId } });
    if (!job || !job.enabled) return;

    return this.pg.withClient(async (client) => {
      const lock = await client.query('SELECT pg_try_advisory_lock($1, $2) ok', [
        LOCK_NS,
        job.id,
      ]);
      if (!lock.rows[0]?.ok) {
        this.logger.warn(`Job ${job.id} ignorado: já em execução.`);
        return null;
      }

      const run = await this.prisma.codeJobRun.create({
        data: {
          jobId: job.id,
          source,
          status: 'RUNNING',
        },
      });

      const started = Date.now();
      let status: ScriptRunStatus = 'SUCCESS';
      let log: any = null;
      let error: string | null = null;

      try {
        log = await this.dispatch(job.handler, reason);
      } catch (e: any) {
        status = 'FAILED';
        error = e?.message ?? String(e);
      } finally {
        const durationMs = Date.now() - started;
        await this.prisma.codeJobRun.update({
          where: { id: run.id },
          data: { status, finishedAt: new Date(), durationMs, log, error },
        });
        await this.prisma.codeJob.update({
          where: { id: job.id },
          data: { lastStatus: status, latestRunAt: new Date() },
        });
        try { await client.query('SELECT pg_advisory_unlock($1, $2)', [LOCK_NS, job.id]); } catch {}
      }

      return run;
    });
  }

  // ===== Dispatch dinâmico para método decorado =====
  private async dispatch(handler: string, reason?: string): Promise<any> {
    const def = this.decorated.find(d => d.handler === handler);
    if (!def) throw new Error(`Handler não encontrado: ${handler}`);

    // resolve instância do provider via DI e invoca o método
    const instance = this.moduleRef.get(def.provider, { strict: false });
    if (!instance || typeof instance[def.methodName] !== 'function') {
      throw new Error(`Método ${def.methodName} não encontrado em ${def.provider?.name}`);
    }
    return await instance[def.methodName]();
  }

  // ===== Criar/alinhar jobs a partir dos decorators =====
  private async ensureJobsFromDecorators() {
    for (const def of this.decorated) {
      const existing = await this.prisma.codeJob.findFirst({ where: { handler: def.handler } });

      if (!existing) {
        const p = toPersistence(def.schedule);
        await this.prisma.codeJob.create({
          data: {
            name: def.name,
            description: def.description ?? null,
            handler: def.handler,
            enabled: def.enabled ?? true,
            scheduleType: p.scheduleType as any, // enum do Prisma
            cronExpression: p.cronExpression,
            intervalSeconds: p.intervalSeconds,
            timezone: p.timezone ?? 'America/Sao_Paulo',
          },
        });
        this.logger.log(`Criado job "${def.name}" (handler=${def.handler}) com schedule padrão.`);
      } else {
        // não sobrescreve agendamento/enabled; apenas alinha nome/descrição
        const patch: Prisma.CodeJobUpdateInput = {
          name: def.name,
          description: def.description ?? existing.description,
        };

        // BACKFILL se não houver nenhum schedule salvo
        if (!existing.cronExpression && !existing.intervalSeconds) {
          const p = toPersistence(def.schedule);
          (patch as any).scheduleType = p.scheduleType;
          (patch as any).cronExpression = p.cronExpression;
          (patch as any).intervalSeconds = p.intervalSeconds;
          (patch as any).timezone = existing.timezone ?? p.timezone ?? 'America/Sao_Paulo';
          this.logger.log(
            `Backfill de schedule aplicado ao job existente "${existing.name}" (handler=${def.handler}).`,
          );
        }

        await this.prisma.codeJob.update({ where: { id: existing.id }, data: patch });
      }
    }
  }

    /**
   * Lê DATABASE_URL (Prisma) e devolve dados de conexão para o pg_dump.
   */
  private parseDatabaseUrl() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error('DATABASE_URL não está definido no ambiente.');
    }

    const url = new URL(raw);
    const host = url.hostname || 'postgres';
    const port = url.port || '5432';
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname.replace(/^\//, '');

    if (!user || !database) {
      throw new Error(`DATABASE_URL inválido: ${raw}`);
    }

    return { host, port, user, password, database };
  }

  /**
   * Executa pg_dump (formato custom -F c) e grava em uploads/backups.
   * Retorna o caminho do arquivo gerado.
   */
  private async createPgDumpFile(): Promise<string> {
    const { host, port, user, password, database } = this.parseDatabaseUrl();

    const backupDir = path.join(process.cwd(), 'uploads', 'backups');
    await fs.promises.mkdir(backupDir, { recursive: true });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      '_',
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');

    const fileName = `${database}_${timestamp}.dump`;
    const fullPath = path.join(backupDir, fileName);

    const args = [
      '-h', host,
      '-p', port,
      '-U', user,
      '-d', database,
      '-F', 'c',      // formato custom (comprimido)
      '-b',           // inclui blobs
      '-f', fullPath, // arquivo de saída
    ];

    this.logger.log(`Iniciando pg_dump para ${database} em ${fullPath}`);

    try {
      await execFileAsync('pg_dump', args, {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      });
    } catch (err: any) {
      this.logger.error(`Erro ao executar pg_dump: ${err?.message ?? err}`);
      throw err;
    }

    this.logger.log(`pg_dump concluído: ${fullPath}`);
    return fullPath;
  }

  /**
   * Lê parâmetros do módulo "parameters" para montar o client do Google Drive.
   */
  private async buildDriveClient(): Promise<{ drive: drive_v3.Drive; folderId: string }> {
    const clientIdParam = await this.parameters.getEffectiveByCode<string>('backup.gdrive.client_id');
    const clientSecretParam = await this.parameters.getEffectiveByCode<string>('backup.gdrive.client_secret');
    const refreshTokenParam = await this.parameters.getEffectiveByCode<string>('backup.gdrive.refresh_token');
    const folderIdParam = await this.parameters.getEffectiveByCode<string>('backup.gdrive.folder_id');

    const clientId = clientIdParam.value;
    const clientSecret = clientSecretParam.value;
    const refreshToken = refreshTokenParam.value;
    const folderId = folderIdParam.value;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      throw new Error('Parâmetros do Google Drive incompletos (backup.gdrive.*).');
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({
      version: 'v3',
      auth: oAuth2Client,
    });

    return { drive, folderId };
  }

  /**
   * Envia o arquivo gerado pelo pg_dump para o Google Drive.
   * Retorna o fileId criado no Drive.
   */
  private async uploadFileToDrive(localPath: string): Promise<string> {
    const { drive, folderId } = await this.buildDriveClient();

    const fileName = path.basename(localPath);
    const fileSize = (await fs.promises.stat(localPath)).size;

    this.logger.log(`Enviando backup para Google Drive: ${fileName} (${fileSize} bytes)`);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(localPath),
      },
      fields: 'id, name',
    });

    const fileId = res.data.id;
    if (!fileId) {
      throw new Error('Upload para Google Drive retornou ID vazio.');
    }

    this.logger.log(`Backup enviado para Google Drive: ${fileName} (fileId=${fileId})`);
    return fileId;
  }

  // ====== HANDLER: Sincronizar Funcionários ======
  @CodeJob({
    handler: 'syncFuncionariosClubeVantagem',
    name: 'Sync Funcionários Sankhya → VR',
    description: 'Marca como clube de vantagens = 1 (Funcionários) para os clientes preferênciais que são funcionários.',
    schedule: { type: 'CRON', cron: '0 */10 * * * *', timezone: 'America/Sao_Paulo' },
    enabled: true,
  })
  private async syncFuncionariosClubeVantagem() {
    // === 0) Prestadores de serviço (parâmetro) ===
    const prest = (await this.parameters.getEffectiveByCode<{ cpfs?: string[] }>('vr.prest_serv'))?.value;
    const prestCpfsRaw = Array.isArray(prest?.cpfs) ? prest!.cpfs! : [];

    // === 1) Tipos e utilidades ===
    type Funcionario = {
      CODFUNC: number;
      NOMEFUNC: string;
      CPF: string;   // Sankhya vem string (pode ter zeros à esquerda)
      CODEMP: number;
      RAZAOSOCIAL: string;
    };

    // normaliza para **exatos 11 dígitos** preservando zeros à esquerda
    const norm11 = (v: unknown) => {
      const d = String(v ?? '').replace(/\D+/g, '');
      if (!d) return '';
      if (d.length > 11) return d.slice(-11);
      return d.padStart(11, '0');
    };

    // === 2) Funcionários (Sankhya) ===
    const sql = `
      SELECT
        FUN.CODFUNC,
        FUN.NOMEFUNC,
        FUN.CPF AS CPF,
        EMP.CODEMP,
        EMP.RAZAOSOCIAL
      FROM TFPFUN FUN
      JOIN TSIEMP EMP ON (EMP.CODEMP = FUN.CODEMP)
      WHERE FUN.SITUACAO NOT IN (0, 8, 9)
        AND FUN.VINCULO NOT IN (90, 99)
        AND FUN.CPF NOT IN (24924146803, 02698449888)
      ORDER BY 2 ASC
    `;
    const funcionarios = await this.snk.executeQueryTyped<Funcionario>(sql);

    // set de CPFs normalizados dos FUNCIONÁRIOS
    const empSet11 = new Set<string>();
    for (const f of funcionarios) {
      const cpf = norm11(f.CPF);
      if (cpf.length === 11) empSet11.add(cpf);
    }

    // === 2.1) Prestadores → somar ao conjunto
    const prestSet11 = new Set<string>();
    for (const p of prestCpfsRaw) {
      const cpf = norm11(p);
      if (cpf.length === 11) prestSet11.add(cpf);
    }
    // conjunto final considerado "funcionário"
    const allEmpSet11 = new Set<string>([...empSet11, ...prestSet11]);

    // === 2.2) Candidatos a criação em clientepreferencial (somente CODEMP=51) ===
    // mapa CPF11 -> nome
    const emp51Map = new Map<string, string>();
    for (const f of funcionarios) {
      if (f.CODEMP !== 51) continue;
      const cpf = norm11(f.CPF);
      if (cpf.length === 11 && !emp51Map.has(cpf)) {
        emp51Map.set(cpf, f.NOMEFUNC);
      }
    }

    // === 3) Preferenciais PF (Postgres) ===
    const result = await this.pg.query<{
      id: number;
      nome: string;
      cpf: string | number | null;
      participa: boolean;
      has_tv1: boolean;
    }>(`
      SELECT
        cp.id,
        cp.nome,
        cp.cnpj::text AS cpf,
        cp.participaclubevantagem AS participa,
        EXISTS (
          SELECT 1
          FROM clientepreferencialtipoclubevantagem x
          WHERE x.id_clientepreferencial = cp.id
            AND x.id_tipoclubevantagem = 1
        ) AS has_tv1
      FROM clientepreferencial cp
      WHERE cp.id_tipoinscricao = 1
    `);

    const clientes = result.rows;

    // mapa CPF11 → (id, nome, participa, has_tv1)
    const byCpf = new Map<string, { id: number; nome: string; participa: boolean; has_tv1: boolean }>();
    const cpfDuplicados = new Map<string, number[]>();

    for (const c of clientes) {
      const cpf11 = norm11(c.cpf);
      if (cpf11.length !== 11) continue;

      if (byCpf.has(cpf11)) {
        const prev = cpfDuplicados.get(cpf11) ?? [];
        cpfDuplicados.set(cpf11, [...prev, c.id]);
      } else {
        byCpf.set(cpf11, { id: c.id, nome: c.nome, participa: !!c.participa, has_tv1: !!c.has_tv1 });
      }
    }

    // === 4) Diffs em memória (mínimo de DML) ===
    const toFlagTrue: number[] = [];
    const toInsertTV1: number[] = [];
    const missingInPreferencial: string[] = [];

    // a) quem deve ter flag/tipo 1: allEmpSet11 (funcionários + prestadores)
    for (const cpf of allEmpSet11) {
      const cli = byCpf.get(cpf);
      if (!cli) {
        missingInPreferencial.push(cpf);
        continue;
      }
      if (!cli.participa) toFlagTrue.push(cli.id);
      if (!cli.has_tv1) toInsertTV1.push(cli.id);
    }

    // b) quem deve remover tipo 1: presentes como tipo 1 mas NÃO em allEmpSet11
    const toDeleteTV1: number[] = [];
    for (const [cpf11, cli] of byCpf.entries()) {
      if (cli.has_tv1 && !allEmpSet11.has(cpf11)) {
        toDeleteTV1.push(cli.id);
      }
    }

    // c) candidatos a CRIAÇÃO (somente CODEMP=51) = cpfs de emp51 que não existem no preferencial
    const emp51ToCreate: { cpf: string; nome: string }[] = [];
    for (const [cpf, nome] of emp51Map.entries()) {
      if (!byCpf.has(cpf)) {
        emp51ToCreate.push({ cpf, nome });
      }
    }

    // === 5) Operações em bloco (tudo em uma transação) ===
    let createdIds: number[] = [];

    await this.pg.transaction(async (tx) => {
      // 5.1) CRIAR clientepreferencial para CODEMP=51 que não existem (INSERT em lote)
      if (emp51ToCreate.length) {
        const cpfs = emp51ToCreate.map(x => x.cpf);
        const nomes = emp51ToCreate.map(x => x.nome);

        const ins = await tx.query<{ id: number }>(`
          WITH src AS (
            SELECT UNNEST($1::text[]) AS cpf, UNNEST($2::text[]) AS nome
          ),
          srcd AS (
            SELECT DISTINCT ON (cpf) cpf, nome
            FROM src
            ORDER BY cpf
          ),
          mx AS (
            SELECT COALESCE(MAX(id), 0) AS base FROM clientepreferencial
          ),
          todo AS (
            SELECT s.cpf, s.nome, (mx.base + ROW_NUMBER() OVER (ORDER BY s.cpf)) AS new_id
            FROM srcd s
            LEFT JOIN clientepreferencial cp ON cp.cnpj::text = s.cpf
            CROSS JOIN mx
            WHERE cp.id IS NULL
          )
          INSERT INTO clientepreferencial (
            id, nomepai, nomemae, observacao2, cargoconjuge, telefoneempresaconjuge,
            bairroempresaconjuge, agencia, conta, praca, empresa, enderecoempresa,
            bairroempresa, telefoneempresa, cargo, nomeconjuge, rgconjuge, orgaoemissorconjuge,
            empresaconjuge, enderecoempresaconjuge, nome, id_situacaocadastro, endereco, bairro,
            id_estado, id_municipio, cep, telefone, celular, email, inscricaoestadual,
            orgaoemissor, cnpj, id_tipoestadocivil, datanascimento, dataresidencia, datacadastro,
            id_tiporesidencia, sexo, observacao, cepempresa, salario, outrarenda, valorlimite,
            cpfconjuge, cepempresaconjuge, salarioconjuge, outrarendaconjuge, id_tipoinscricao,
            vencimentocreditorotativo, permitecreditorotativo, permitecheque, bloqueado, bloqueadoautomatico,
            numero, id_tiporestricaocliente, dataatualizacaocadastro, complemento, enviasms, enviaemail,
            id_regiaocliente, id_classerisco, participaclubevantagem, id_tipoorigemcadastro,
            tipovencimentocreditorotativo, utilizaappdescontos, permitechequevista, senhaportal,
            aceitotermosuso, protecaodadosmotivo, id_tiposolicitacaolgpd, bloqueadolgpd
          )
          SELECT
            t.new_id, '', '', '', '','','', '', '', '', '','', '', '', '', '', '', '', '', '',
            t.nome, 1, '', '', 35, 3537800, 18187000, '', '', '', '', '', CAST(t.cpf AS numeric(14,0)), 0,
            DATE '2000-01-01', DATE '2000-01-01', NOW(), 5, 1, '', 0, 0.00, 0.00, 0.00, 0, 0, 0.00, 0.00, 1,
            0, 'f', 'f', 'f', 'f', '', 0, NOW(), '', 'f', 'f', 1, 3, 't', 1, -1, 't', 'f', '', 'f', '', NULL, 'f'
          FROM todo t
          RETURNING id
        `, [cpfs, nomes]);

        createdIds = ins.rows.map(r => r.id);

        // inserir vínculo tipo=1 para os recém-criados
        if (createdIds.length) {
          await tx.query(
            `INSERT INTO clientepreferencialtipoclubevantagem (id_clientepreferencial, id_tipoclubevantagem)
            SELECT x.id, 1
            FROM UNNEST($1::int[]) AS x(id)`,
            [createdIds],
          );
        }
      }

      // 5.2) UPDATE flag global em lote (existentes)
      if (toFlagTrue.length) {
        await tx.query(
          `UPDATE clientepreferencial
          SET participaclubevantagem = 't'
          WHERE id = ANY($1::int[]) AND participaclubevantagem <> 't'`,
          [toFlagTrue],
        );
      }

      // 5.3) INSERT tipo=1 para existentes que faltam
      if (toInsertTV1.length) {
        await tx.query(
          `INSERT INTO clientepreferencialtipoclubevantagem (id_clientepreferencial, id_tipoclubevantagem)
          SELECT x.id, 1
          FROM UNNEST($1::int[]) AS x(id)
          LEFT JOIN clientepreferencialtipoclubevantagem c
            ON c.id_clientepreferencial = x.id AND c.id_tipoclubevantagem = 1
          WHERE c.id_clientepreferencial IS NULL`,
          [toInsertTV1],
        );
      }

      // 5.4) DELETE tipo=1 para quem não é mais funcionário/prestador
      if (toDeleteTV1.length) {
        await tx.query(
          `DELETE FROM clientepreferencialtipoclubevantagem
          WHERE id_tipoclubevantagem = 1
            AND id_clientepreferencial = ANY($1::int[])`,
          [toDeleteTV1],
        );
      }
    });

    // === 6) Retorno minimalista (incluídos/excluídos) ===
    // incluídos = existentes que receberam tipo=1 + recém-criados
    const included = Array.from(new Set<number>([...toInsertTV1, ...createdIds]));
    const excluded = toDeleteTV1;

    return { included, excluded, createdIds };
  }

  @CodeJob({
    handler: 'syncDadosVR',
    name: 'Sync VRMaster',
    description: 'Sincroniza com os dados do VRMaster (Lojas, Centro de Custos, Mercadológicos, etc...)',
    schedule: { type: 'DAILY_AT', time: '12:00', timezone: 'America/Sao_Paulo' },
    enabled: true,
  })
  private async syncDadosVR() {
    const storesVr = await this.stores.getStoresFromVR()
    const costCentersVr = await this.costCenters.getCostCenterFromVR()
    const departmentsVr = await this.departments.getDepartmentsFromVr()

    return "Dados Sincronizados"
  }

    @CodeJob({
    handler: 'backupDatabaseToGoogleDrive',
    name: 'Backup banco PostgreSQL para Google Drive',
    description: 'Gera um pg_dump do banco principal e envia o arquivo para o Google Drive.',
    schedule: { type: 'DAILY_AT', time: '02:00', timezone: 'America/Sao_Paulo' },
    enabled: true,
  })
  private async backupDatabaseToGoogleDrive() {
    // 1) Gera arquivo de backup (pg_dump)
    const localPath = await this.createPgDumpFile();

    try {
      // 2) Envia para o Google Drive
      const fileId = await this.uploadFileToDrive(localPath);

      // 3) (Opcional) remover arquivo local depois do upload
      try {
        await fs.promises.unlink(localPath);
      } catch (e) {
        this.logger.warn(`Não foi possível excluir o arquivo local de backup: ${localPath}`);
      }

      return `Backup concluído e enviado para o Google Drive (fileId=${fileId})`;
    } catch (err) {
      // Em caso de falha, manter o arquivo local para inspeção
      this.logger.error(`Falha no backup/Upload. Arquivo local preservado: ${localPath}`);
      throw err;
    }
  }

}
