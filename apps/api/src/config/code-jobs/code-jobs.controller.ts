import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { CodeJobsService } from './code-jobs.service';
import { RunNowDto } from './dto/run-now.dto';
import { CodeJobEntity } from './entities/code-job.entity';
import { CodeJobRunEntity } from './entities/code-job-run.entity';
import { PaginatedCodeJobRunsEntity } from './entities/paginated-runs.entity';
import { GoogleDriveBackupConfigEntity } from './entities/google-drive-backup-config.entity';
import { GoogleDriveOauthUrlEntity } from './entities/google-drive-oauth-url.entity';
import { GoogleDriveBackupTestEntity } from './entities/google-drive-backup-test.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';
import { GoogleDriveFolderListEntity } from './entities/google-drive-folder-list.entity';
import { GoogleDriveBackupFileListEntity } from './entities/google-drive-backup-file-list.entity';
import { GoogleDriveBackupRestoreResultEntity } from './entities/google-drive-backup-restore-result.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { UpdateCodeJobDto } from './dto/update-code-job.dto';
import { ScriptRunStatus } from '@prisma/client';
import { UpsertGoogleDriveBackupConfigDto } from './dto/upsert-google-drive-backup-config.dto';
import { GoogleDriveOauthUrlDto } from './dto/google-drive-oauth-url.dto';
import { GoogleDriveOauthExchangeDto } from './dto/google-drive-oauth-exchange.dto';
import { GoogleDriveBackupRestoreDto } from './dto/google-drive-backup-restore.dto';

@ApiTags('code-jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@Controller('code-jobs')
export class CodeJobsController {
  constructor(private readonly service: CodeJobsService) {}

  @Get()
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Listar jobs (decorados)' })
  @ApiOkResponse({ type: [CodeJobEntity] })
  async list() {
    return this.service.list();
  }

  @Get('backup/google-drive/config')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Ler configuração do backup em Google Drive' })
  @ApiOkResponse({ type: GoogleDriveBackupConfigEntity })
  async getGoogleDriveBackupConfig() {
    return this.service.getGoogleDriveBackupConfig();
  }

  @Patch('backup/google-drive/config')
  @Permissions('codeJobs:editar')
  @ApiOperation({ summary: 'Salvar configuração do backup em Google Drive' })
  @ApiOkResponse({ type: GoogleDriveBackupConfigEntity })
  async upsertGoogleDriveBackupConfig(@Body() dto: UpsertGoogleDriveBackupConfigDto) {
    return this.service.upsertGoogleDriveBackupConfig(dto);
  }

  @Post('backup/google-drive/oauth-url')
  @Permissions('codeJobs:editar')
  @ApiOperation({ summary: 'Gerar URL de autorização OAuth para Google Drive' })
  @ApiOkResponse({ type: GoogleDriveOauthUrlEntity })
  async getGoogleDriveOauthUrl(@Body() dto: GoogleDriveOauthUrlDto) {
    return this.service.getGoogleDriveOauthUrl(dto);
  }

  @Post('backup/google-drive/oauth-exchange')
  @Permissions('codeJobs:editar')
  @ApiOperation({ summary: 'Trocar authorization code por refresh token do Google Drive' })
  @ApiOkResponse({ type: GoogleDriveBackupConfigEntity })
  async exchangeGoogleDriveOauthCode(@Body() dto: GoogleDriveOauthExchangeDto) {
    return this.service.exchangeGoogleDriveOauthCode(dto);
  }

  @Post('backup/google-drive/test')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Testar acesso ao Google Drive com a configuração atual' })
  @ApiOkResponse({ type: GoogleDriveBackupTestEntity })
  async testGoogleDriveBackupConfig() {
    return this.service.testGoogleDriveBackupConfig();
  }

  @Get('backup/google-drive/folders')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Listar pastas do Google Drive por pasta pai' })
  @ApiQuery({ name: 'parentId', required: false, description: "Pasta pai (default: 'root')" })
  @ApiQuery({ name: 'pageToken', required: false, description: 'Token de paginacao' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Quantidade de itens por pagina (1-200)' })
  @ApiOkResponse({ type: GoogleDriveFolderListEntity })
  async listGoogleDriveFolders(
    @Query('parentId') parentId?: string,
    @Query('pageToken') pageToken?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedPageSize = pageSize ? Number.parseInt(pageSize, 10) : undefined;
    const normalizedPageSize =
      parsedPageSize !== undefined && Number.isFinite(parsedPageSize)
        ? parsedPageSize
        : undefined;
    return this.service.listGoogleDriveFolders(
      parentId,
      pageToken,
      normalizedPageSize,
    );
  }

  @Get('backup/google-drive/folders/:folderId')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Detalhes de uma pasta do Google Drive' })
  @ApiParam({ name: 'folderId', type: String })
  @ApiOkResponse({ type: GoogleDriveFolderEntity })
  async getGoogleDriveFolderDetails(@Param('folderId') folderId: string) {
    return this.service.getGoogleDriveFolderDetails(folderId);
  }

  @Get('backup/google-drive/backups')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Listar arquivos de backup na pasta configurada do Google Drive' })
  @ApiQuery({ name: 'pageToken', required: false, description: 'Token de paginacao' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Quantidade de itens por pagina (1-200)' })
  @ApiOkResponse({ type: GoogleDriveBackupFileListEntity })
  async listGoogleDriveBackupFiles(
    @Query('pageToken') pageToken?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedPageSize = pageSize ? Number.parseInt(pageSize, 10) : undefined;
    const normalizedPageSize =
      parsedPageSize !== undefined && Number.isFinite(parsedPageSize)
        ? parsedPageSize
        : undefined;

    return this.service.listGoogleDriveBackupFiles(
      pageToken,
      normalizedPageSize,
    );
  }

  @Post('backup/google-drive/restore')
  @Permissions('codeJobs:executar')
  @ApiOperation({ summary: 'Restaurar banco a partir de arquivo de backup do Google Drive' })
  @ApiOkResponse({ type: GoogleDriveBackupRestoreResultEntity })
  async restoreGoogleDriveBackup(@Body() dto: GoogleDriveBackupRestoreDto) {
    return this.service.restoreGoogleDriveBackup(dto);
  }

  @Patch(':id')
  @Permissions('codeJobs:editar')
  @ApiOperation({ summary: 'Atualizar job (agendamento/ativar-desativar)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CodeJobEntity })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCodeJobDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/run-now')
  @Permissions('codeJobs:executar')
  @ApiOperation({ summary: 'Executar agora (manual)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CodeJobRunEntity })
  async runNow(@Param('id', ParseIntPipe) id: number, @Body() dto: RunNowDto) {
    return this.service.runNow(id, dto?.reason ?? 'manual trigger');
  }

  @Get(':id/runs')
  @Permissions('codeJobs:consultar')
  @ApiOperation({ summary: 'Listar execuções' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'page', required: false }) 
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'initialDate', required: false, type: String, description: 'YYYY-MM-DD (>= startedAt)' })
  @ApiQuery({ name: 'finalDate', required: false, type: String, description: 'YYYY-MM-DD (<= startedAt)' })
  @ApiQuery({
      name: 'status',
      required: false,
      enum: Object.values(ScriptRunStatus), // usa o enum real do Prisma no Swagger
      description: 'Status (case-insensitive)',
    })
  @ApiOkResponse({ type: PaginatedCodeJobRunsEntity })
  async runs(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
    @Query('initialDate') initialDate?: string,
    @Query('finalDate') finalDate?: string,
    @Query('status') status?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;

    return this.service.listRuns(id, p, ps, {initialDate, finalDate, status});
  }
}
