import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { ModuleRef } from "@nestjs/core";
import { Prisma, ScriptRunStatus } from "@prisma/client";
import { PrismaService } from "src/db/prisma/prisma.service";
import { PgService } from "src/db/pg/pg.service";
import { toPersistence } from "src/config/db-scripts/schedule-builder";
import { SnkApiService } from "src/snk-api/snk-api.service";
import {
  CodeJob,
  getDecoratedJobs,
  DecoratedJobEntry,
  CodeJobParameterDefinition,
  CodeJobParameterRules,
} from "./code-job.decorator";
import { ParametersService } from "src/config/parameters/parameters.service";
import { UpdateCodeJobDto } from "./dto/update-code-job.dto";
import { UpsertGoogleDriveBackupConfigDto } from "./dto/upsert-google-drive-backup-config.dto";
import { GoogleDriveOauthUrlDto } from "./dto/google-drive-oauth-url.dto";
import { GoogleDriveOauthExchangeDto } from "./dto/google-drive-oauth-exchange.dto";
import { GoogleDriveBackupRestoreDto } from "./dto/google-drive-backup-restore.dto";
import { StoresService } from "src/config/stores/stores.service";
import { CostCentersService } from "src/adm/cost-centers/cost-centers.service";
import { DepartmentsService } from "src/adm/departments/departments.service";

import { execFile } from "child_process";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { google, drive_v3 } from "googleapis";

const execFileAsync = promisify(execFile);

const LOCK_NS = 764_001; // namespace para pg_advisory_lock
type RunFilters = {
  initialDate?: string; // "YYYY-MM-DD"
  finalDate?: string; // "YYYY-MM-DD"
  status?: "SUCCESS" | "ERROR" | "RUNNING" | "ALL" | string | undefined;
};

type CodeJobExecutionContext = {
  codeJobRunId: number;
  jobId: number;
  source: "SCHEDULE" | "MANUAL" | "RETRY";
  reason?: string;
  params?: Record<string, unknown>;
};

type GoogleDriveBackupRawConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
};

@Injectable()
export class CodeJobsService implements OnApplicationBootstrap {
  private static readonly PARAM_GDRIVE_CLIENT_ID = "backup.gdrive.client_id";
  private static readonly PARAM_GDRIVE_CLIENT_SECRET =
    "backup.gdrive.client_secret";
  private static readonly PARAM_GDRIVE_REFRESH_TOKEN =
    "backup.gdrive.refresh_token";
  private static readonly PARAM_GDRIVE_FOLDER_ID = "backup.gdrive.folder_id";
  private static readonly UNSET_MARKERS = new Set(["", "**preencher**"]);
  private static readonly DRIVE_FOLDER_MIME =
    "application/vnd.google-apps.folder";
  private static readonly BACKUP_RETENTION_KEEP_LAST = 5;

  private readonly logger = new Logger(CodeJobsService.name);
  private decorated!: DecoratedJobEntry[];
  private validHandlers!: Set<string>;
  private pgDumpCommandCache: string | null = null;
  private pgRestoreCommandCache: string | null = null;

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly pg: PgService,
    private readonly moduleRef: ModuleRef,
    private readonly snk: SnkApiService,
    private readonly parameters: ParametersService,
    private readonly stores: StoresService,
    private readonly costCenters: CostCentersService,
    private readonly departments: DepartmentsService,
  ) {}

  async getGoogleDriveBackupConfig() {
    const raw = await this.getGoogleDriveRawConfig();
    const hasClientId = this.isConfiguredValue(raw.clientId);
    const hasClientSecret = this.isConfiguredValue(raw.clientSecret);
    const hasRefreshToken = this.isConfiguredValue(raw.refreshToken);
    const hasFolderId = this.isConfiguredValue(raw.folderId);

    return {
      hasClientId,
      hasClientSecret,
      hasRefreshToken,
      hasFolderId,
      clientIdPreview: hasClientId ? this.maskValue(raw.clientId, 6, 4) : null,
      clientSecretPreview: hasClientSecret
        ? this.maskValue(raw.clientSecret, 2, 2)
        : null,
      refreshTokenPreview: hasRefreshToken
        ? this.maskValue(raw.refreshToken, 6, 4)
        : null,
      folderId: hasFolderId ? raw.folderId.trim() : null,
    };
  }

  async upsertGoogleDriveBackupConfig(dto: UpsertGoogleDriveBackupConfigDto) {
    const updates: Array<{ code: string; value: string }> = [];

    if (dto.clientId !== undefined) {
      updates.push({
        code: CodeJobsService.PARAM_GDRIVE_CLIENT_ID,
        value: dto.clientId.trim(),
      });
    }
    if (dto.clientSecret !== undefined) {
      updates.push({
        code: CodeJobsService.PARAM_GDRIVE_CLIENT_SECRET,
        value: dto.clientSecret.trim(),
      });
    }
    if (dto.folderId !== undefined) {
      updates.push({
        code: CodeJobsService.PARAM_GDRIVE_FOLDER_ID,
        value: dto.folderId.trim(),
      });
    }
    if (dto.refreshToken !== undefined) {
      updates.push({
        code: CodeJobsService.PARAM_GDRIVE_REFRESH_TOKEN,
        value: dto.refreshToken.trim(),
      });
    }

    if (!updates.length) {
      throw new BadRequestException(
        "Informe ao menos um campo para atualizar a configuracao.",
      );
    }

    for (const entry of updates) {
      await this.parameters.patchValue(entry.code, { value: entry.value });
    }

    return this.getGoogleDriveBackupConfig();
  }

  async getGoogleDriveOauthUrl(dto: GoogleDriveOauthUrlDto) {
    const redirectUri = this.validateRedirectUri(dto.redirectUri);
    const oAuth2Client = await this.buildOAuthClient(redirectUri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: ["https://www.googleapis.com/auth/drive"],
      state: dto.state?.trim() || undefined,
    });

    return { authUrl };
  }

  async exchangeGoogleDriveOauthCode(dto: GoogleDriveOauthExchangeDto) {
    const redirectUri = this.validateRedirectUri(dto.redirectUri);
    const oAuth2Client = await this.buildOAuthClient(redirectUri);

    const { tokens } = await oAuth2Client.getToken(dto.code.trim());
    const refreshToken = tokens.refresh_token?.trim();

    if (!refreshToken) {
      throw new BadRequestException(
        "Google nao retornou refresh_token. Revogue o acesso do app na conta Google e autorize novamente.",
      );
    }

    await this.parameters.patchValue(CodeJobsService.PARAM_GDRIVE_REFRESH_TOKEN, {
      value: refreshToken,
    });

    return this.getGoogleDriveBackupConfig();
  }

  async testGoogleDriveBackupConfig() {
    const { drive, folderId } = await this.buildDriveClient();

    let folderData: drive_v3.Schema$File;
    try {
      const folder = await drive.files.get({
        fileId: folderId,
        fields: "id,name,mimeType",
        supportsAllDrives: true,
      });
      folderData = folder.data;
    } catch (error) {
      this.throwGoogleDriveFolderError(error, folderId);
    }

    if (!folderData.id) {
      throw new BadRequestException("A pasta informada nao foi encontrada.");
    }
    if (folderData.mimeType !== CodeJobsService.DRIVE_FOLDER_MIME) {
      throw new BadRequestException(
        "O ID informado nao pertence a uma pasta do Google Drive.",
      );
    }

    return {
      ok: true,
      folderId: folderData.id,
      folderName: folderData.name ?? "(sem nome)",
    };
  }

  async listGoogleDriveFolders(
    parentId?: string,
    pageToken?: string,
    pageSize = 100,
  ) {
    const drive = await this.buildDriveApiClient();
    const normalizedParentId = String(parentId ?? "root").trim() || "root";
    const normalizedPageSize = Math.min(200, Math.max(1, Math.floor(pageSize)));
    const escapedParent = normalizedParentId.replace(/'/g, "\\'");

    const res = await drive.files.list({
      q: `'${escapedParent}' in parents and mimeType='${CodeJobsService.DRIVE_FOLDER_MIME}' and trashed=false`,
      pageSize: normalizedPageSize,
      pageToken: pageToken?.trim() || undefined,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: "name_natural",
      fields: "nextPageToken, files(id,name,parents,mimeType)",
    });

    const items = (res.data.files ?? [])
      .filter((f) => f.id && f.mimeType === CodeJobsService.DRIVE_FOLDER_MIME)
      .map((f) => ({
        id: f.id as string,
        name: f.name ?? "(sem nome)",
        parents: f.parents ?? [],
      }));

    return {
      parentId: normalizedParentId,
      items,
      nextPageToken: res.data.nextPageToken ?? null,
    };
  }

  async getGoogleDriveFolderDetails(folderId: string) {
    const normalizedFolderId = String(folderId ?? "").trim();
    if (!normalizedFolderId) {
      throw new BadRequestException("folderId e obrigatorio.");
    }

    const drive = await this.buildDriveApiClient();
    let folderData: drive_v3.Schema$File;
    try {
      const folder = await drive.files.get({
        fileId: normalizedFolderId,
        fields: "id,name,mimeType,parents",
        supportsAllDrives: true,
      });
      folderData = folder.data;
    } catch (error) {
      this.throwGoogleDriveFolderError(error, normalizedFolderId);
    }

    if (!folderData.id) {
      throw new BadRequestException("Pasta nao encontrada.");
    }
    if (folderData.mimeType !== CodeJobsService.DRIVE_FOLDER_MIME) {
      throw new BadRequestException(
        "O ID informado nao pertence a uma pasta do Google Drive.",
      );
    }

    return {
      id: folderData.id,
      name: folderData.name ?? "(sem nome)",
      parents: folderData.parents ?? [],
    };
  }

  async listGoogleDriveBackupFiles(pageToken?: string, pageSize = 100) {
    const { drive, folderId } = await this.buildDriveClient();
    const { database } = this.parseDatabaseUrl();

    const normalizedPageSize = Math.min(200, Math.max(1, Math.floor(pageSize)));
    const escapedFolderId = folderId.replace(/'/g, "\\'");

    const res = await drive.files.list({
      q: `'${escapedFolderId}' in parents and trashed=false and mimeType!='${CodeJobsService.DRIVE_FOLDER_MIME}'`,
      pageSize: normalizedPageSize,
      pageToken: pageToken?.trim() || undefined,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: "createdTime desc",
      fields: "nextPageToken, files(id,name,createdTime,size)",
    });

    const items = (res.data.files ?? [])
      .filter((file) => file.id && this.isGoogleDriveBackupFile(file.name, database))
      .map((file) => ({
        id: file.id as string,
        name: file.name ?? "(sem nome)",
        createdTime: file.createdTime ?? null,
        sizeBytes: this.parseGoogleDriveSize(file.size),
      }));

    return {
      folderId,
      items,
      nextPageToken: res.data.nextPageToken ?? null,
    };
  }

  async restoreGoogleDriveBackup(dto: GoogleDriveBackupRestoreDto) {
    const fileId = String(dto.fileId ?? "").trim();
    if (!fileId) {
      throw new BadRequestException("fileId e obrigatorio.");
    }

    const { drive, folderId } = await this.buildDriveClient();
    const { host, port, user, password, database } = this.parseDatabaseUrl();
    let pgRestoreCommand: string;
    try {
      pgRestoreCommand = await this.resolvePgRestoreCommand();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    let metadata: drive_v3.Schema$File;
    try {
      const fileMeta = await drive.files.get({
        fileId,
        fields: "id,name,mimeType,parents",
        supportsAllDrives: true,
      });
      metadata = fileMeta.data;
    } catch (error) {
      this.throwGoogleDriveFileError(error, fileId);
    }

    if (!metadata.id) {
      throw new BadRequestException(`Arquivo de backup nao encontrado (${fileId}).`);
    }
    if (
      Array.isArray(metadata.parents) &&
      metadata.parents.length > 0 &&
      !metadata.parents.includes(folderId)
    ) {
      throw new BadRequestException(
        "O arquivo informado nao pertence a pasta de backup configurada.",
      );
    }
    if (!this.isGoogleDriveBackupFile(metadata.name, database)) {
      throw new BadRequestException(
        "O arquivo informado nao parece ser um backup valido gerado pela aplicacao.",
      );
    }

    const restoreDir = path.join(process.cwd(), "uploads", "backups", "restore");
    await fs.promises.mkdir(restoreDir, { recursive: true });

    const safeFileName = this.sanitizeLocalFileName(
      metadata.name ?? `${fileId}.dump`,
    );
    const localPath = path.join(restoreDir, `${Date.now()}_${safeFileName}`);

    try {
      let downloadStream: NodeJS.ReadableStream;
      try {
        const download = await drive.files.get(
          {
            fileId,
            alt: "media",
            supportsAllDrives: true,
          },
          { responseType: "stream" },
        );
        downloadStream = download.data as NodeJS.ReadableStream;
      } catch (error) {
        this.throwGoogleDriveFileError(error, fileId);
      }

      await pipeline(
        downloadStream,
        fs.createWriteStream(localPath),
      );

      const args = [
        "-h",
        host,
        "-p",
        port,
        "-U",
        user,
        "-d",
        database,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        localPath,
      ];

      await execFileAsync(pgRestoreCommand, args, {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        this.pgRestoreCommandCache = null;
        throw new BadRequestException(
          "Executavel pg_restore nao encontrado. Instale o cliente do PostgreSQL e configure PG_RESTORE_PATH.",
        );
      }

      const details = String(
        error?.stderr || error?.stdout || error?.message || "erro nao identificado",
      )
        .replace(/\s+/g, " ")
        .trim();

      throw new BadRequestException(
        `Falha ao restaurar backup no banco ${database}: ${details}`,
      );
    } finally {
      try {
        await fs.promises.unlink(localPath);
      } catch {
        // ignora erro de limpeza do arquivo local temporario
      }
    }

    return {
      ok: true,
      fileId: metadata.id,
      fileName: metadata.name ?? safeFileName,
      database,
      restoredAt: new Date().toISOString(),
    };
  }

  private async getGoogleDriveRawConfig(): Promise<GoogleDriveBackupRawConfig> {
    const [clientId, clientSecret, refreshToken, folderId] = await Promise.all([
      this.getGlobalParameterValue(CodeJobsService.PARAM_GDRIVE_CLIENT_ID),
      this.getGlobalParameterValue(CodeJobsService.PARAM_GDRIVE_CLIENT_SECRET),
      this.getGlobalParameterValue(CodeJobsService.PARAM_GDRIVE_REFRESH_TOKEN),
      this.getGlobalParameterValue(CodeJobsService.PARAM_GDRIVE_FOLDER_ID),
    ]);

    return {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      refreshToken: refreshToken.trim(),
      folderId: folderId.trim(),
    };
  }

  private async getGlobalParameterValue(code: string): Promise<string> {
    const param = await this.parameters.getEffectiveByCode<string>(code);
    return String(param?.value ?? "");
  }

  private isConfiguredValue(input?: string | null): boolean {
    const value = String(input ?? "").trim();
    return !CodeJobsService.UNSET_MARKERS.has(value);
  }

  private maskValue(value: string, left = 3, right = 2): string {
    const normalized = value.trim();
    if (!normalized) return "";
    if (normalized.length <= left + right + 1) return "*".repeat(8);
    const startPart = normalized.slice(0, left);
    const endPart = normalized.slice(-right);
    return `${startPart}${"*".repeat(8)}${endPart}`;
  }

  private validateRedirectUri(input: string): string {
    const value = String(input ?? "").trim();
    if (!value) {
      throw new BadRequestException("redirectUri e obrigatorio.");
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException("redirectUri invalido.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new BadRequestException(
        "redirectUri deve usar protocolo http:// ou https://.",
      );
    }

    return parsed.toString();
  }

  private throwGoogleDriveFolderError(error: unknown, folderId: string): never {
    const payload = (error as any)?.response?.data?.error;
    const reason = payload?.errors?.[0]?.reason;
    const status =
      Number((error as any)?.status) ||
      Number((error as any)?.response?.status) ||
      Number((error as any)?.code) ||
      undefined;

    if (status === 404 || reason === "notFound") {
      throw new BadRequestException(
        `A pasta configurada (${folderId}) nao foi encontrada no Google Drive. Selecione outra pasta e salve a configuracao.`,
      );
    }

    if (
      status === 403 ||
      reason === "insufficientFilePermissions" ||
      reason === "forbidden"
    ) {
      throw new BadRequestException(
        `Sem permissao para acessar a pasta (${folderId}) no Google Drive com a conta conectada.`,
      );
    }

    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "erro nao identificado";

    throw new BadRequestException(
      `Falha ao acessar a pasta do Google Drive: ${message}.`,
    );
  }

  private throwGoogleDriveFileError(error: unknown, fileId: string): never {
    const payload = (error as any)?.response?.data?.error;
    const reason = payload?.errors?.[0]?.reason;
    const status =
      Number((error as any)?.status) ||
      Number((error as any)?.response?.status) ||
      Number((error as any)?.code) ||
      undefined;

    if (status === 404 || reason === "notFound") {
      throw new BadRequestException(
        `Arquivo de backup nao encontrado no Google Drive (${fileId}).`,
      );
    }

    if (
      status === 403 ||
      reason === "insufficientFilePermissions" ||
      reason === "forbidden"
    ) {
      throw new BadRequestException(
        `Sem permissao para acessar o arquivo (${fileId}) no Google Drive com a conta conectada.`,
      );
    }

    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "erro nao identificado";

    throw new BadRequestException(
      `Falha ao acessar arquivo no Google Drive: ${message}.`,
    );
  }

  private isGoogleDriveBackupFile(
    fileName: string | null | undefined,
    database: string,
  ): boolean {
    const normalizedName = String(fileName ?? "").trim();
    if (!normalizedName) return false;

    const hasExpectedPrefix = normalizedName.startsWith(`${database}_`);
    const hasDumpExtension = normalizedName.toLowerCase().endsWith(".dump");
    return hasExpectedPrefix && hasDumpExtension;
  }

  private parseGoogleDriveSize(
    value: string | number | null | undefined,
  ): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private sanitizeLocalFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  }

  private async buildOAuthClient(redirectUri?: string) {
    const raw = await this.getGoogleDriveRawConfig();

    if (
      !this.isConfiguredValue(raw.clientId) ||
      !this.isConfiguredValue(raw.clientSecret)
    ) {
      throw new BadRequestException(
        "Configure client_id e client_secret do Google Drive antes de autorizar.",
      );
    }

    return new google.auth.OAuth2(
      raw.clientId,
      raw.clientSecret,
      redirectUri,
    );
  }

  private async buildDriveApiClient(): Promise<drive_v3.Drive> {
    const raw = await this.getGoogleDriveRawConfig();
    const missing: string[] = [];

    if (!this.isConfiguredValue(raw.clientId)) {
      missing.push(CodeJobsService.PARAM_GDRIVE_CLIENT_ID);
    }
    if (!this.isConfiguredValue(raw.clientSecret)) {
      missing.push(CodeJobsService.PARAM_GDRIVE_CLIENT_SECRET);
    }
    if (!this.isConfiguredValue(raw.refreshToken)) {
      missing.push(CodeJobsService.PARAM_GDRIVE_REFRESH_TOKEN);
    }

    if (missing.length) {
      throw new BadRequestException(
        `Parametros do Google Drive incompletos: ${missing.join(", ")}.`,
      );
    }

    const oAuth2Client = await this.buildOAuthClient();
    oAuth2Client.setCredentials({ refresh_token: raw.refreshToken });

    return google.drive({
      version: "v3",
      auth: oAuth2Client,
    });
  }

  private async listAllGoogleDriveBackupFiles(
    drive: drive_v3.Drive,
    folderId: string,
    database: string,
  ): Promise<drive_v3.Schema$File[]> {
    const escapedFolderId = folderId.replace(/'/g, "\\'");
    const backups: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
      const res = await drive.files.list({
        q: `'${escapedFolderId}' in parents and trashed=false and mimeType!='${CodeJobsService.DRIVE_FOLDER_MIME}'`,
        pageSize: 200,
        pageToken,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        orderBy: "createdTime desc",
        fields: "nextPageToken, files(id,name,createdTime)",
      });

      const filtered = (res.data.files ?? []).filter((file) =>
        file.id && this.isGoogleDriveBackupFile(file.name, database),
      );
      backups.push(...filtered);

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return backups;
  }

  private async cleanupOldGoogleDriveBackups(): Promise<number> {
    const { drive, folderId } = await this.buildDriveClient();
    const { database } = this.parseDatabaseUrl();

    const backups = await this.listAllGoogleDriveBackupFiles(
      drive,
      folderId,
      database,
    );
    if (backups.length <= CodeJobsService.BACKUP_RETENTION_KEEP_LAST) {
      return 0;
    }

    const toDelete = backups.slice(CodeJobsService.BACKUP_RETENTION_KEEP_LAST);
    let deletedCount = 0;

    for (const backup of toDelete) {
      if (!backup.id) continue;
      try {
        await drive.files.delete({
          fileId: backup.id,
          supportsAllDrives: true,
        });
        deletedCount += 1;
      } catch (error) {
        this.logger.warn(
          `Falha ao remover backup antigo no Google Drive (${backup.id}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return deletedCount;
  }

  // ===== Lifecycle =====
  async onApplicationBootstrap() {
    // captura todos os mÃƒÂ©todos anotados
    this.decorated = getDecoratedJobs();
    this.validHandlers = new Set(this.decorated.map((d) => d.handler));

    // cria/alinha jobs no banco (sem sobrescrever agendamento/enabled do usuÃƒÂ¡rio),
    // mas agora tambÃƒÂ©m faz BACKFILL de agendamento quando nÃƒÂ£o houver nenhum.
    await this.ensureJobsFromDecorators();

    // registra no scheduler somente os vÃƒÂ¡lidos e habilitados
    await this.reloadSchedules();
  }

  // ===== Listar apenas jobs decorados =====
  async list() {
    const jobs = await this.prisma.codeJob.findMany({
      where: { handler: { in: Array.from(this.validHandlers) } },
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    });

    return jobs.map((job) => ({
      ...job,
      parameters: this.getDecoratedJob(job.handler)?.parameters ?? [],
    }));
  }

  // ===== Atualizar (schedule/enabled) =====
  async update(id: number, dto?: UpdateCodeJobDto) {
    dto = dto ?? {};

    const job = await this.prisma.codeJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job nÃƒÂ£o encontrado.");
    if (!this.validHandlers.has(job.handler)) {
      throw new ForbiddenException("Job nÃƒÂ£o ÃƒÂ© gerenciado por cÃƒÂ³digo.");
    }

    const data: Prisma.CodeJobUpdateInput = {};

    // --- enabled: aceita boolean, "true"/"false", 1/0, "1"/"0"
    if (dto.enabled !== undefined) {
      const v = dto.enabled;
      const enabled = v === true;
      data.enabled = enabled;
    }

    // --- detecÃƒÂ§ÃƒÂ£o de intenÃƒÂ§ÃƒÂ£o de mudar schedule (dois formatos)
    const hasNewShape =
      dto.scheduleType !== undefined ||
      dto.cron ||
      dto.interval ||
      dto.dailyAt ||
      dto.weeklyAt;

    const hasLegacyShape =
      typeof dto.cronExpression === "string" ||
      typeof dto.intervalSeconds === "number";

    if (hasNewShape) {
      if (!dto.scheduleType) {
        throw new BadRequestException(
          "scheduleType ÃƒÂ© obrigatÃƒÂ³rio ao alterar agendamento.",
        );
      }

      const scheduleConfig =
        dto.scheduleType === "CRON" && dto.cron
          ? ({
              type: "CRON",
              cron: dto.cron.cron,
              timezone: dto.cron?.timezone,
            } as const)
          : dto.scheduleType === "INTERVAL" && dto.interval
            ? ({
                type: "INTERVAL",
                everySeconds: dto.interval.everySeconds,
              } as const)
            : dto.scheduleType === "DAILY_AT" && dto.dailyAt
              ? ({
                  type: "DAILY_AT",
                  time: dto.dailyAt.time,
                  timezone: dto.dailyAt?.timezone,
                } as const)
              : dto.scheduleType === "WEEKLY_AT" && dto.weeklyAt
                ? ({
                    type: "WEEKLY_AT",
                    weekday: dto.weeklyAt.weekday,
                    time: dto.weeklyAt.time,
                    timezone: dto.weeklyAt?.timezone,
                  } as const)
                : null;

      if (!scheduleConfig) {
        throw new BadRequestException(
          "ParÃƒÂ¢metros do agendamento incompletos para o tipo informado.",
        );
      }

      const p = toPersistence(scheduleConfig);
      (data as any).scheduleType = p.scheduleType;
      data.cronExpression = p.cronExpression;
      (data as any).intervalSeconds = p.intervalSeconds;
      (data as any).timezone =
        p.timezone ?? job.timezone ?? "America/Sao_Paulo";
    } else if (hasLegacyShape) {
      // formato Ã¢Â€ÂœlegadoÃ¢Â€Â vindo do Swagger (cronExpression/intervalSeconds/timezone)
      if (typeof dto.cronExpression === "string") {
        (data as any).scheduleType = "CRON";
        data.cronExpression = dto.cronExpression;
        (data as any).intervalSeconds = null;
        if (dto.timezone) (data as any).timezone = dto.timezone;
      } else if (typeof dto.intervalSeconds === "number") {
        (data as any).scheduleType = "INTERVAL";
        (data as any).intervalSeconds = Math.max(
          1,
          Math.floor(dto.intervalSeconds),
        );
        data.cronExpression = null;
        if (dto.timezone) (data as any).timezone = dto.timezone;
      } else {
        throw new BadRequestException(
          'Informe "cronExpression" (string) ou "intervalSeconds" (number).',
        );
      }
    } else {
      // sem mudanÃƒÂ§a de schedule -> ok; pode ser apenas toggle do enabled
    }

    const updated = await this.prisma.codeJob.update({ where: { id }, data });

    // re-registra no scheduler
    await this.unregisterSingle(id);
    await this.registerSingle(id);

    return updated;
  }

  /**
   * Lista execuÃƒÂ§ÃƒÂµes (runs) de um script.
   * Se page/pageSize nÃƒÂ£o forem passados, retorna atÃƒÂ© 200 itens (modo simples).
   */
  async listRuns(
    jobId: number,
    page?: number,
    pageSize?: number,
    filters?: RunFilters,
  ) {
    const where = this.buildWhere(jobId, filters);

    if (!page || !pageSize) {
      return this.prisma.codeJobRun.findMany({
        where,
        orderBy: { id: "desc" },
        take: 200,
      });
    }

    const skip = Math.max(0, (page - 1) * pageSize);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.codeJobRun.findMany({
        where,
        orderBy: { id: "desc" },
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

  async runNow(id: number, reason?: string, params?: Record<string, unknown>) {
    const job = await this.prisma.codeJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job nÃƒÂ£o encontrado.");
    if (!this.validHandlers.has(job.handler)) {
      throw new ForbiddenException("Job nÃƒÂ£o ÃƒÂ© gerenciado por cÃƒÂ³digo.");
    }
    const normalizedParams = this.validateManualParams(job.handler, params);
    return this.executeJob(job.id, "MANUAL", reason, normalizedParams);
  }

  // ===== Registro de agendamentos =====
  private async reloadSchedules() {
    const jobs = await this.prisma.codeJob.findMany({
      where: { handler: { in: Array.from(this.validHandlers) } },
    });

    for (const j of jobs) await this.unregisterSingle(j.id);

    // Registra apenas os HABILITADOS e com schedule vÃƒÂ¡lido
    for (const j of jobs) {
      if (!j.enabled) continue;
      if (!j.cronExpression && !j.intervalSeconds) {
        this.logger.warn(
          `Job ${j.id} (${j.name}) estÃƒÂ¡ habilitado mas sem schedule salvo; nÃƒÂ£o serÃƒÂ¡ agendado.`,
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
    const match = allowed.find((v) => v.toUpperCase() === wanted.toUpperCase());
    return match as ScriptRunStatus | undefined;
  }

  private buildWhere(
    jobId: number,
    filters?: RunFilters,
  ): Prisma.CodeJobRunWhereInput {
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
        where.status = st; // agora ÃƒÂ© ScriptRunStatus de verdade
      }
    }

    return where;
  }

  private getDecoratedJob(handler: string) {
    return this.decorated.find((d) => d.handler === handler);
  }

  private validateManualParams(handler: string, rawParams?: Record<string, unknown>) {
    const def = this.getDecoratedJob(handler);
    const parameters = def?.parameters ?? [];
    const parameterRules = def?.parameterRules;

    if (rawParams !== undefined && (rawParams === null || typeof rawParams !== "object" || Array.isArray(rawParams))) {
      throw new BadRequestException("Os parametros da execucao manual devem ser enviados como objeto.");
    }

    const input = rawParams ?? {};
    const meaningfulInput = Object.fromEntries(
      Object.entries(input).filter(([, value]) => !this.isEmptyParamValue(value)),
    );

    if (!parameters.length) {
      if (Object.keys(meaningfulInput).length > 0) {
        throw new BadRequestException("Este job nao aceita parametros de execucao manual.");
      }
      return undefined;
    }

    const allowed = new Set(parameters.map((param) => param.name));
    const unknown = Object.keys(meaningfulInput).filter((name) => !allowed.has(name));
    if (unknown.length > 0) {
      throw new BadRequestException(`Parametro(s) nao suportado(s): ${unknown.join(", ")}.`);
    }

    const normalized: Record<string, unknown> = {};
    for (const parameter of parameters) {
      const value = meaningfulInput[parameter.name];
      if (this.isEmptyParamValue(value)) {
        if (parameter.required) {
          throw new BadRequestException(`Parametro obrigatorio nao informado: ${this.getParameterLabel(parameter)}.`);
        }
        continue;
      }

      normalized[parameter.name] = this.normalizeManualParam(parameter, value);
    }

    this.validateParameterRules(parameters, parameterRules, normalized);

    return Object.keys(normalized).length ? normalized : undefined;
  }

  private validateParameterRules(
    parameters: CodeJobParameterDefinition[],
    rules: CodeJobParameterRules | undefined,
    values: Record<string, unknown>,
  ) {
    for (const group of rules?.allOrNone ?? []) {
      const filled = group.filter((name) => !this.isEmptyParamValue(values[name]));
      if (filled.length > 0 && filled.length < group.length) {
        const labels = group.map((name) => this.getParameterLabelByName(parameters, name)).join(" e ");
        throw new BadRequestException(`Informe ${labels} juntos, ou deixe todos em branco.`);
      }
    }

    for (const range of rules?.dateRanges ?? []) {
      const start = values[range.start];
      const end = values[range.end];
      if (this.isEmptyParamValue(start) || this.isEmptyParamValue(end)) continue;
      if (String(start) > String(end)) {
        throw new BadRequestException(
          `${this.getParameterLabelByName(parameters, range.start)} deve ser menor ou igual a ${this.getParameterLabelByName(parameters, range.end)}.`,
        );
      }
    }
  }

  private normalizeManualParam(parameter: CodeJobParameterDefinition, value: unknown) {
    switch (parameter.type) {
      case "date": {
        if (typeof value !== "string" || !this.isValidYmdDate(value)) {
          throw new BadRequestException(`${this.getParameterLabel(parameter)} deve ser uma data valida no formato YYYY-MM-DD.`);
        }
        return value;
      }
      case "number": {
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(parsed)) {
          throw new BadRequestException(`${this.getParameterLabel(parameter)} deve ser numerico.`);
        }
        return parsed;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        if (value === "true" || value === "1") return true;
        if (value === "false" || value === "0") return false;
        throw new BadRequestException(`${this.getParameterLabel(parameter)} deve ser booleano.`);
      }
      case "multi-select": {
        const rawItems = Array.isArray(value)
          ? value
          : String(value)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
        const items = Array.from(new Set(rawItems.map((item) => String(item).trim()).filter(Boolean)));
        const allowedValues = new Set((parameter.options ?? []).map((option) => option.value));
        const invalidItems = allowedValues.size > 0 ? items.filter((item) => !allowedValues.has(item)) : [];
        if (invalidItems.length > 0) {
          throw new BadRequestException(
            `${this.getParameterLabel(parameter)} possui valor(es) invalido(s): ${invalidItems.join(", ")}.`,
          );
        }
        return items;
      }
      case "string":
      default:
        return String(value);
    }
  }

  private isEmptyParamValue(value: unknown) {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  private isValidYmdDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  private getParameterLabel(parameter: CodeJobParameterDefinition) {
    return parameter.label ?? parameter.name;
  }

  private getParameterLabelByName(parameters: CodeJobParameterDefinition[], name: string) {
    const parameter = parameters.find((item) => item.name === name);
    return parameter ? this.getParameterLabel(parameter) : name;
  }

  private async unregisterSingle(id: number) {
    const key = `code-job-${id}`;
    try {
      this.scheduler.deleteCronJob(key);
    } catch {}
    try {
      this.scheduler.deleteInterval(key);
    } catch {}
    try {
      this.scheduler.deleteTimeout(key);
    } catch {}
  }

  private async registerSingle(id: number) {
    const j = await this.prisma.codeJob.findUnique({ where: { id } });
    if (!j || !j.enabled) return;
    if (!this.validHandlers.has(j.handler)) return;

    const key = `code-job-${j.id}`;
    const run = () => this.safeRun(j.id);

    switch (j.scheduleType) {
      case "CRON": {
        if (!j.cronExpression) {
          this.logger.warn(
            `Job ${j.id} (${j.name}) tipo=CRON sem cronExpression; ignorado.`,
          );
          return;
        }
        const tz = j.timezone ?? "America/Sao_Paulo";
        const cronJob = new CronJob(j.cronExpression, run, null, false, tz);
        this.scheduler.addCronJob(key, cronJob as any); // evitar mismatch de tipos entre libs
        cronJob.start();
        this.logger.log(
          `Agendado CRON job ${j.id} (${j.name}) -> "${j.cronExpression}" @ ${tz}`,
        );
        break;
      }
      case "INTERVAL": {
        if (!j.intervalSeconds) {
          this.logger.warn(
            `Job ${j.id} (${j.name}) tipo=INTERVAL sem intervalSeconds; ignorado.`,
          );
          return;
        }
        const ms = j.intervalSeconds * 1000;
        const handle = setInterval(run, ms);
        this.scheduler.addInterval(key, handle as any);
        this.logger.log(
          `Agendado INTERVAL job ${j.id} (${j.name}) -> cada ${j.intervalSeconds}s`,
        );
        break;
      }
      default:
        this.logger.warn(
          `Job ${j.id} (${j.name}) com scheduleType inesperado: ${j.scheduleType}`,
        );
        break;
    }
  }

  private async safeRun(jobId: number) {
    try {
      await this.executeJob(jobId, "SCHEDULE");
    } catch (e: any) {
      this.logger.error(`Erro nÃƒÂ£o tratado no job ${jobId}: ${e?.message ?? e}`);
    }
  }

  // ===== ExecuÃƒÂ§ÃƒÂ£o com lock + log =====
  private async executeJob(
    jobId: number,
    source: "SCHEDULE" | "MANUAL" | "RETRY",
    reason?: string,
    params?: Record<string, unknown>,
  ) {
    const job = await this.prisma.codeJob.findUnique({ where: { id: jobId } });
    if (!job) return;
    if (!job.enabled && source !== "MANUAL") return;

    return this.pg.withClient(async (client) => {
      const lock = await client.query(
        "SELECT pg_try_advisory_lock($1, $2) ok",
        [LOCK_NS, job.id],
      );
      if (!lock.rows[0]?.ok) {
        this.logger.warn(`Job ${job.id} ignorado: jÃƒÂ¡ em execuÃƒÂ§ÃƒÂ£o.`);
        return null;
      }

      const run = await this.prisma.codeJobRun.create({
        data: {
          jobId: job.id,
          source,
          status: "RUNNING",
        },
      });

      const started = Date.now();
      let status: ScriptRunStatus = "SUCCESS";
      let log: any = null;
      let error: string | null = null;

      try {
        log = await this.dispatch(job.handler, {
          codeJobRunId: run.id,
          jobId: job.id,
          source,
          reason,
          params,
        });
      } catch (e: any) {
        status = "FAILED";
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
        try {
          await client.query("SELECT pg_advisory_unlock($1, $2)", [
            LOCK_NS,
            job.id,
          ]);
        } catch {}
      }

      return run;
    });
  }

  // ===== Dispatch dinÃƒÂ¢mico para mÃƒÂ©todo decorado =====
  private async dispatch(handler: string, context?: CodeJobExecutionContext): Promise<any> {
    const def = this.decorated.find((d) => d.handler === handler);
    if (!def) throw new Error(`Handler nÃƒÂ£o encontrado: ${handler}`);

    // resolve instÃƒÂ¢ncia do provider via DI e invoca o mÃƒÂ©todo
    const instance = this.moduleRef.get(def.provider, { strict: false });
    if (!instance || typeof instance[def.methodName] !== "function") {
      throw new Error(
        `MÃƒÂ©todo ${def.methodName} nÃƒÂ£o encontrado em ${def.provider?.name}`,
      );
    }
    return await instance[def.methodName](context);
  }

  // ===== Criar/alinhar jobs a partir dos decorators =====
  private async ensureJobsFromDecorators() {
    for (const def of this.decorated) {
      const existing = await this.prisma.codeJob.findFirst({
        where: { handler: def.handler },
      });

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
            timezone: p.timezone ?? "America/Sao_Paulo",
          },
        });
        this.logger.log(
          `Criado job "${def.name}" (handler=${def.handler}) com schedule padrÃƒÂ£o.`,
        );
      } else {
        // nÃƒÂ£o sobrescreve agendamento/enabled; apenas alinha nome/descriÃƒÂ§ÃƒÂ£o
        const patch: Prisma.CodeJobUpdateInput = {
          name: def.name,
          description: def.description ?? existing.description,
        };

        // BACKFILL se nÃƒÂ£o houver nenhum schedule salvo
        if (!existing.cronExpression && !existing.intervalSeconds) {
          const p = toPersistence(def.schedule);
          (patch as any).scheduleType = p.scheduleType;
          (patch as any).cronExpression = p.cronExpression;
          (patch as any).intervalSeconds = p.intervalSeconds;
          (patch as any).timezone =
            existing.timezone ?? p.timezone ?? "America/Sao_Paulo";
          this.logger.log(
            `Backfill de schedule aplicado ao job existente "${existing.name}" (handler=${def.handler}).`,
          );
        }

        await this.prisma.codeJob.update({
          where: { id: existing.id },
          data: patch,
        });
      }
    }
  }

  /**
   * Resolve o executavel pg_dump no ambiente atual.
   */
  private async resolvePgDumpCommand(): Promise<string> {
    if (this.pgDumpCommandCache) {
      return this.pgDumpCommandCache;
    }

    const candidates = new Set<string>();
    const addCandidate = (value?: string | null) => {
      const normalized = String(value ?? "")
        .trim()
        .replace(/^"(.*)"$/, "$1");
      if (normalized) candidates.add(normalized);
    };

    addCandidate(process.env.PG_DUMP_PATH);
    addCandidate(process.env.PGDUMP_PATH);

    if (process.platform === "win32") {
      addCandidate("pg_dump.exe");
      addCandidate("pg_dump");
      for (const fromFs of await this.getWindowsPgDumpCandidates()) {
        addCandidate(fromFs);
      }
    } else {
      addCandidate("pg_dump");
      addCandidate("/usr/bin/pg_dump");
      addCandidate("/usr/local/bin/pg_dump");

      if (process.platform === "darwin") {
        addCandidate("/opt/homebrew/bin/pg_dump");
        addCandidate("/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump");
      }
    }

    for (const candidate of candidates) {
      try {
        await execFileAsync(candidate, ["--version"]);
        this.pgDumpCommandCache = candidate;
        return candidate;
      } catch {
        // tenta proximo candidato
      }
    }

    throw new Error(
      "Nao foi possivel localizar o executavel pg_dump. Instale o cliente do PostgreSQL e configure a variavel PG_DUMP_PATH com o caminho completo do pg_dump.",
    );
  }

  private async resolvePgRestoreCommand(): Promise<string> {
    if (this.pgRestoreCommandCache) {
      return this.pgRestoreCommandCache;
    }

    const candidates = new Set<string>();
    const addCandidate = (value?: string | null) => {
      const normalized = String(value ?? "")
        .trim()
        .replace(/^"(.*)"$/, "$1");
      if (normalized) candidates.add(normalized);
    };

    addCandidate(process.env.PG_RESTORE_PATH);
    addCandidate(process.env.PGRESTORE_PATH);

    if (process.platform === "win32") {
      addCandidate("pg_restore.exe");
      addCandidate("pg_restore");
      for (const fromFs of await this.getWindowsPgRestoreCandidates()) {
        addCandidate(fromFs);
      }
    } else {
      addCandidate("pg_restore");
      addCandidate("/usr/bin/pg_restore");
      addCandidate("/usr/local/bin/pg_restore");

      if (process.platform === "darwin") {
        addCandidate("/opt/homebrew/bin/pg_restore");
        addCandidate("/Applications/Postgres.app/Contents/Versions/latest/bin/pg_restore");
      }
    }

    for (const candidate of candidates) {
      try {
        await execFileAsync(candidate, ["--version"]);
        this.pgRestoreCommandCache = candidate;
        return candidate;
      } catch {
        // tenta proximo candidato
      }
    }

    throw new Error(
      "Nao foi possivel localizar o executavel pg_restore. Instale o cliente do PostgreSQL e configure a variavel PG_RESTORE_PATH com o caminho completo do pg_restore.",
    );
  }

  private async getWindowsPgDumpCandidates(): Promise<string[]> {
    const roots = [
      "C:\\Program Files\\PostgreSQL",
      "C:\\Program Files (x86)\\PostgreSQL",
    ];
    const candidates: string[] = [];

    for (const root of roots) {
      try {
        const entries = await fs.promises.readdir(root, {
          withFileTypes: true,
        });
        const versions = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) =>
            b.localeCompare(a, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );

        for (const version of versions) {
          candidates.push(path.join(root, version, "bin", "pg_dump.exe"));
        }
      } catch {
        // diretorio nao existe nesta maquina
      }
    }

    return candidates;
  }

  private async getWindowsPgRestoreCandidates(): Promise<string[]> {
    const roots = [
      "C:\\Program Files\\PostgreSQL",
      "C:\\Program Files (x86)\\PostgreSQL",
    ];
    const candidates: string[] = [];

    for (const root of roots) {
      try {
        const entries = await fs.promises.readdir(root, {
          withFileTypes: true,
        });
        const versions = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) =>
            b.localeCompare(a, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );

        for (const version of versions) {
          candidates.push(path.join(root, version, "bin", "pg_restore.exe"));
        }
      } catch {
        // diretorio nao existe nesta maquina
      }
    }

    return candidates;
  }

  private parseDatabaseUrl() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error("DATABASE_URL nÃƒÂ£o estÃƒÂ¡ definido no ambiente.");
    }

    const url = new URL(raw);
    const host = url.hostname || "postgres";
    const port = url.port || "5432";
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname.replace(/^\//, "");

    if (!user || !database) {
      throw new Error(`DATABASE_URL invÃƒÂ¡lido: ${raw}`);
    }

    return { host, port, user, password, database };
  }

  /**
   * Executa pg_dump (formato custom -F c) e grava em uploads/backups.
   * Retorna o caminho do arquivo gerado.
   */
  private async createPgDumpFile(): Promise<string> {
    const { host, port, user, password, database } = this.parseDatabaseUrl();
    const pgDumpCommand = await this.resolvePgDumpCommand();

    const backupDir = path.join(process.cwd(), "uploads", "backups");
    await fs.promises.mkdir(backupDir, { recursive: true });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      "_",
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join("");

    const fileName = `${database}_${timestamp}.dump`;
    const fullPath = path.join(backupDir, fileName);

    const args = [
      "-h",
      host,
      "-p",
      port,
      "-U",
      user,
      "-d",
      database,
      "-F",
      "c", // formato custom (comprimido)
      "-b", // inclui blobs
      "-f",
      fullPath, // arquivo de saÃƒÂ­da
    ];

    this.logger.log(
      `Iniciando pg_dump (${pgDumpCommand}) para ${database} em ${fullPath}`,
    );

    try {
      await execFileAsync(pgDumpCommand, args, {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      });
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        this.pgDumpCommandCache = null;
        throw new Error(
          "Executavel pg_dump nao encontrado. Instale o cliente do PostgreSQL e configure PG_DUMP_PATH com o caminho completo do pg_dump.",
        );
      }
      this.logger.error(`Erro ao executar pg_dump: ${err?.message ?? err}`);
      throw err;
    }

    this.logger.log(`pg_dump concluÃƒÂ­do: ${fullPath}`);
    return fullPath;
  }

  /**
   * LÃƒÂª parÃƒÂ¢metros do mÃƒÂ³dulo "parameters" para montar o client do Google Drive.
   */
  private async buildDriveClient(): Promise<{
    drive: drive_v3.Drive;
    folderId: string;
  }> {
    const raw = await this.getGoogleDriveRawConfig();
    if (!this.isConfiguredValue(raw.folderId)) {
      throw new BadRequestException(
        `Parametros do Google Drive incompletos: ${CodeJobsService.PARAM_GDRIVE_FOLDER_ID}.`,
      );
    }

    const drive = await this.buildDriveApiClient();
    return { drive, folderId: raw.folderId };
  }

  /**
   * Envia o arquivo gerado pelo pg_dump para o Google Drive.
   * Retorna o fileId criado no Drive.
   */
  private async uploadFileToDrive(localPath: string): Promise<string> {
    const { drive, folderId } = await this.buildDriveClient();

    const fileName = path.basename(localPath);
    const fileSize = (await fs.promises.stat(localPath)).size;

    this.logger.log(
      `Enviando backup para Google Drive: ${fileName} (${fileSize} bytes)`,
    );

    let res: drive_v3.Schema$File;
    try {
      const upload = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: "application/octet-stream",
          body: fs.createReadStream(localPath),
        },
        fields: "id, name",
        supportsAllDrives: true,
      });
      res = upload.data;
    } catch (error) {
      this.throwGoogleDriveFolderError(error, folderId);
    }

    const fileId = res.id;
    if (!fileId) {
      throw new Error("Upload para Google Drive retornou ID vazio.");
    }

    this.logger.log(
      `Backup enviado para Google Drive: ${fileName} (fileId=${fileId})`,
    );
    return fileId;
  }

  // ====== HANDLER: Sincronizar FuncionÃƒÂ¡rios ======
  @CodeJob({
    handler: "syncFuncionariosClubeVantagem",
    name: "Sync FuncionÃƒÂ¡rios Sankhya Ã¢Â†Â’ VR",
    description:
      "Marca como clube de vantagens = 1 (FuncionÃƒÂ¡rios) para os clientes preferÃƒÂªnciais que sÃƒÂ£o funcionÃƒÂ¡rios.",
    schedule: {
      type: "CRON",
      cron: "0 */10 * * * *",
      timezone: "America/Sao_Paulo",
    },
    enabled: true,
  })
  private async syncFuncionariosClubeVantagem() {
    // === 0) Prestadores de serviÃƒÂ§o (parÃƒÂ¢metro) ===
    const prest = (
      await this.parameters.getEffectiveByCode<{ cpfs?: string[] }>(
        "vr.prest_serv",
      )
    )?.value;
    const prestCpfsRaw = Array.isArray(prest?.cpfs) ? prest!.cpfs! : [];

    // === 1) Tipos e utilidades ===
    type Funcionario = {
      CODFUNC: number;
      NOMEFUNC: string;
      CPF: string; // Sankhya vem string (pode ter zeros ÃƒÂ  esquerda)
      CODEMP: number;
      RAZAOSOCIAL: string;
    };

    // normaliza para **exatos 11 dÃƒÂ­gitos** preservando zeros ÃƒÂ  esquerda
    const norm11 = (v: unknown) => {
      const d = String(v ?? "").replace(/\D+/g, "");
      if (!d) return "";
      if (d.length > 11) return d.slice(-11);
      return d.padStart(11, "0");
    };

    // === 2) FuncionÃƒÂ¡rios (Sankhya) ===
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

    // set de CPFs normalizados dos FUNCIONÃƒÂRIOS
    const empSet11 = new Set<string>();
    for (const f of funcionarios) {
      const cpf = norm11(f.CPF);
      if (cpf.length === 11) empSet11.add(cpf);
    }

    // === 2.1) Prestadores Ã¢Â†Â’ somar ao conjunto
    const prestSet11 = new Set<string>();
    for (const p of prestCpfsRaw) {
      const cpf = norm11(p);
      if (cpf.length === 11) prestSet11.add(cpf);
    }
    // conjunto final considerado "funcionÃƒÂ¡rio"
    const allEmpSet11 = new Set<string>([...empSet11, ...prestSet11]);

    // === 2.2) Candidatos a criaÃƒÂ§ÃƒÂ£o em clientepreferencial (somente CODEMP=51) ===
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

    // mapa CPF11 Ã¢Â†Â’ (id, nome, participa, has_tv1)
    const byCpf = new Map<
      string,
      { id: number; nome: string; participa: boolean; has_tv1: boolean }
    >();
    const cpfDuplicados = new Map<string, number[]>();

    for (const c of clientes) {
      const cpf11 = norm11(c.cpf);
      if (cpf11.length !== 11) continue;

      if (byCpf.has(cpf11)) {
        const prev = cpfDuplicados.get(cpf11) ?? [];
        cpfDuplicados.set(cpf11, [...prev, c.id]);
      } else {
        byCpf.set(cpf11, {
          id: c.id,
          nome: c.nome,
          participa: !!c.participa,
          has_tv1: !!c.has_tv1,
        });
      }
    }

    // === 4) Diffs em memÃƒÂ³ria (mÃƒÂ­nimo de DML) ===
    const toFlagTrue: number[] = [];
    const toInsertTV1: number[] = [];
    const missingInPreferencial: string[] = [];

    // a) quem deve ter flag/tipo 1: allEmpSet11 (funcionÃƒÂ¡rios + prestadores)
    for (const cpf of allEmpSet11) {
      const cli = byCpf.get(cpf);
      if (!cli) {
        missingInPreferencial.push(cpf);
        continue;
      }
      if (!cli.participa) toFlagTrue.push(cli.id);
      if (!cli.has_tv1) toInsertTV1.push(cli.id);
    }

    // b) quem deve remover tipo 1: presentes como tipo 1 mas NÃƒÂƒO em allEmpSet11
    const toDeleteTV1: number[] = [];
    for (const [cpf11, cli] of byCpf.entries()) {
      if (cli.has_tv1 && !allEmpSet11.has(cpf11)) {
        toDeleteTV1.push(cli.id);
      }
    }

    // c) candidatos a CRIAÃƒÂ‡ÃƒÂƒO (somente CODEMP=51) = cpfs de emp51 que nÃƒÂ£o existem no preferencial
    const emp51ToCreate: { cpf: string; nome: string }[] = [];
    for (const [cpf, nome] of emp51Map.entries()) {
      if (!byCpf.has(cpf)) {
        emp51ToCreate.push({ cpf, nome });
      }
    }

    // === 5) OperaÃƒÂ§ÃƒÂµes em bloco (tudo em uma transaÃƒÂ§ÃƒÂ£o) ===
    let createdIds: number[] = [];

    await this.pg.transaction(async (tx) => {
      // 5.1) CRIAR clientepreferencial para CODEMP=51 que nÃƒÂ£o existem (INSERT em lote)
      if (emp51ToCreate.length) {
        const cpfs = emp51ToCreate.map((x) => x.cpf);
        const nomes = emp51ToCreate.map((x) => x.nome);

        const ins = await tx.query<{ id: number }>(
          `
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
        `,
          [cpfs, nomes],
        );

        createdIds = ins.rows.map((r) => r.id);

        // inserir vÃƒÂ­nculo tipo=1 para os recÃƒÂ©m-criados
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

      // 5.4) DELETE tipo=1 para quem nÃƒÂ£o ÃƒÂ© mais funcionÃƒÂ¡rio/prestador
      if (toDeleteTV1.length) {
        await tx.query(
          `DELETE FROM clientepreferencialtipoclubevantagem
          WHERE id_tipoclubevantagem = 1
            AND id_clientepreferencial = ANY($1::int[])`,
          [toDeleteTV1],
        );
      }
    });

    // === 6) Retorno minimalista (incluÃƒÂ­dos/excluÃƒÂ­dos) ===
    // incluÃƒÂ­dos = existentes que receberam tipo=1 + recÃƒÂ©m-criados
    const included = Array.from(
      new Set<number>([...toInsertTV1, ...createdIds]),
    );
    const excluded = toDeleteTV1;

    return { included, excluded, createdIds };
  }

  @CodeJob({
    handler: "syncDadosVR",
    name: "Sync VRMaster",
    description:
      "Sincroniza com os dados do VRMaster (Lojas, Centro de Custos, MercadolÃƒÂ³gicos, etc...)",
    schedule: {
      type: "DAILY_AT",
      time: "12:00",
      timezone: "America/Sao_Paulo",
    },
    enabled: true,
  })
  private async syncDadosVR() {
    const storesVr = await this.stores.getStoresFromVR();
    const costCentersVr = await this.costCenters.getCostCenterFromVR();
    const costCenterTypeSnk = await this.costCenters.getCostCenterFromSankhya();
    const departmentsVr = await this.departments.getDepartmentsFromVr();

    return "Dados Sincronizados";
  }

  @CodeJob({
    handler: "backupDatabaseToGoogleDrive",
    name: "Backup banco PostgreSQL para Google Drive",
    description:
      "Gera um pg_dump do banco principal e envia o arquivo para o Google Drive.",
    schedule: {
      type: "DAILY_AT",
      time: "02:00",
      timezone: "America/Sao_Paulo",
    },
    enabled: true,
  })
  private async backupDatabaseToGoogleDrive() {
    // 1) Gera arquivo de backup (pg_dump)
    const localPath = await this.createPgDumpFile();

    try {
      // 2) Envia para o Google Drive
      const fileId = await this.uploadFileToDrive(localPath);
      let deletedCount = 0;
      try {
        deletedCount = await this.cleanupOldGoogleDriveBackups();
      } catch (cleanupError) {
        this.logger.warn(
          `Falha ao aplicar retencao de backups no Google Drive: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        );
      }

      // 3) (Opcional) remover arquivo local depois do upload
      try {
        await fs.promises.unlink(localPath);
      } catch (e) {
        this.logger.warn(
          `Nao foi possivel excluir o arquivo local de backup: ${localPath}`,
        );
      }

      return `Backup concluido e enviado para o Google Drive (fileId=${fileId}). Backups antigos removidos: ${deletedCount}.`;
    } catch (err) {
      // Em caso de falha, manter o arquivo local para inspecao
      this.logger.error(
        `Falha no backup/Upload. Arquivo local preservado: ${localPath}`,
      );
      throw err;
    }
  }
}

