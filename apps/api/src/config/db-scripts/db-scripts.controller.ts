import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Delete,
  UseGuards, Query
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse,
  ApiParam, ApiQuery, ApiExtraModels, getSchemaPath, ApiBody
} from '@nestjs/swagger';
import { DbScriptsService } from './db-scripts.service';
import { CreateDbScriptDto } from './dto/create-db-script.dto';
import { UpdateDbScriptDto } from './dto/update-db-script.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { DbScriptEntity } from './entities/db-script.entity';
import { DbScriptRunEntity } from './entities/db-script-run.entity';
import { DbScriptRunPaginatedEntity } from './entities/paginated-runs.entity';
import { OkResponseDto } from './dto/ok-response.dto';
import { ScriptRunStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('db-scripts')
@ApiExtraModels(DbScriptEntity, DbScriptRunEntity, DbScriptRunPaginatedEntity, OkResponseDto)
@Controller('db-scripts')
export class DbScriptsController {
  constructor(
    private readonly service: DbScriptsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions('dbScripts:consultar')
  @ApiOperation({ summary: 'Listar scripts cadastrados' })
  @ApiOkResponse({ type: DbScriptEntity, isArray: true })
  list() {
    return this.service.list();
  }

  @Get(':id')
  @Permissions('dbScripts:consultar')
  @ApiOperation({ summary: 'Obter um script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: DbScriptEntity })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Get(':id/runs')
  @Permissions('dbScripts:consultar')
  @ApiOperation({ summary: 'Listar execuções (runs) de um script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'initialDate', required: false, type: String, description: 'YYYY-MM-DD (>= startedAt)' })
  @ApiQuery({ name: 'finalDate', required: false, type: String, description: 'YYYY-MM-DD (<= startedAt)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ScriptRunStatus), // usa o enum real do Prisma no Swagger
    description: 'Status (case-insensitive)',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { type: 'array', items: { $ref: getSchemaPath(DbScriptRunEntity) } },
        { $ref: getSchemaPath(DbScriptRunPaginatedEntity) },
      ],
    },
  })
  async runs(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('initialDate') initialDate?: string,
    @Query('finalDate') finalDate?: string,
    @Query('status') status?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const ps = pageSize ? parseInt(pageSize, 10) : undefined;

    return this.service.listRuns(id, p, ps, {
      initialDate,
      finalDate,
      status,
    });
  }

  @Post()
  @Permissions('dbScripts:incluir')
  @ApiOperation({ summary: 'Criar script' })
  @ApiBody({
    type: CreateDbScriptDto,
    examples: {
      cronHourly: {
        summary: 'CRON (hora em hora)',
        value: {
          name: 'Exemplo CRON horário',
          description: 'Roda de hora em hora',
          sqlText: "DO $$ BEGIN RAISE NOTICE 'ok'; END $$ LANGUAGE plpgsql;",
          enabled: true,
          scheduleType: 'CRON',
          cron: { cron: '0 0 * * * *', timezone: 'America/Sao_Paulo' },
          timeoutSec: 120,
        },
      },
      interval45s: {
        summary: 'Intervalo puro (45s)',
        value: {
          name: 'Worker 45s',
          sqlText: 'SELECT now();',
          scheduleType: 'INTERVAL',
          interval: { everySeconds: 45 },
        },
      },
    },
  })
  @ApiCreatedResponse({ type: DbScriptEntity })
  async create(@Body() dto: CreateDbScriptDto) {
    const p = toPersistence(mapDtoToSchedule(dto));
    const created = await this.service.create({
      name: dto.name,
      description: dto.description,
      sqlText: dto.sqlText,
      enabled: dto.enabled ?? true,
      wrapInTransaction: dto.wrapInTransaction ?? false,
      searchPath: dto.searchPath,
      timeoutSec: dto.timeoutSec ?? 600,
      scheduleType: p.scheduleType as any,
      cronExpression: p.cronExpression ?? null,
      intervalSeconds: p.intervalSeconds ?? null,
      timezone: p.timezone ?? 'America/Sao_Paulo',
    });
    return created;
  }

  @Patch(':id')
  @Permissions('dbScripts:editar')
  @ApiOperation({ summary: 'Atualizar script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: DbScriptEntity })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDbScriptDto) {
    // Comece só com campos realmente persistidos
    const data: any = {};

    // Campos comuns (persistidos)
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sqlText !== undefined) data.sqlText = dto.sqlText;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.wrapInTransaction !== undefined) data.wrapInTransaction = dto.wrapInTransaction;
    if (dto.searchPath !== undefined) data.searchPath = dto.searchPath;
    if (dto.timeoutSec !== undefined) data.timeoutSec = dto.timeoutSec;

    // Se veio qualquer forma "amigável" de agendamento, converta para persistência
    const hasFriendlySchedule =
      dto.scheduleType !== undefined || dto.cron !== undefined || dto.interval !== undefined ||
      dto.dailyAt !== undefined || dto.weeklyAt !== undefined;

    if (hasFriendlySchedule) {
      const p = toPersistence(mapDtoToSchedule(dto as any));
      data.scheduleType    = p.scheduleType;
      data.cronExpression  = p.cronExpression ?? null;
      data.intervalSeconds = p.intervalSeconds ?? null;
      data.timezone        = p.timezone ?? 'America/Sao_Paulo';
    } else {
      // Caso o front envie direto os campos persistidos, aceite também
      if ((dto as any).scheduleType !== undefined) data.scheduleType = (dto as any).scheduleType;
      if ((dto as any).cronExpression !== undefined) data.cronExpression = (dto as any).cronExpression;
      if ((dto as any).intervalSeconds !== undefined) data.intervalSeconds = (dto as any).intervalSeconds;
      if ((dto as any).timezone !== undefined) data.timezone = (dto as any).timezone;
    }

    // IMPORTANTE: nunca envie os helpers pro Prisma
    // (só por segurança, caso mude algo acima no futuro)
    delete (data as any).cron;
    delete (data as any).interval;
    delete (data as any).dailyAt;
    delete (data as any).weeklyAt;

    return this.service.update(id, data);
  }

  @Post(':id/run-now')
  @Permissions('dbScripts:executar')
  @ApiOperation({ summary: 'Executar imediatamente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OkResponseDto })
  async runNow(@Param('id', ParseIntPipe) id: number) {
    await this.service.runScript(id, 'MANUAL', 'manual trigger');
    return { ok: true };
  }

  @Patch(':id/enable')
  @Permissions('dbScripts:editar')
  @ApiOperation({ summary: 'Habilitar script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: DbScriptEntity })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.service.enable(id);
  }

  @Patch(':id/disable')
  @Permissions('dbScripts:editar')
  @ApiOperation({ summary: 'Desabilitar script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: DbScriptEntity })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.service.disable(id);
  }

  @Delete(':id')
  @Permissions('dbScripts:excluir')
  @ApiOperation({ summary: 'Excluir script' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OkResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

// ===== helpers (mantêm sua lógica) =====
import { toPersistence } from './schedule-builder';
import { CreateDbScriptDto as CreateDto } from './dto/create-db-script.dto';
function mapDtoToSchedule(dto: CreateDto) {
  switch (dto.scheduleType) {
    case 'CRON':
      return { type: 'CRON', cron: dto.cron!.cron, timezone: dto.cron?.timezone } as const;
    case 'INTERVAL':
      return { type: 'INTERVAL', everySeconds: dto.interval!.everySeconds } as const;
    case 'DAILY_AT':
      return { type: 'DAILY_AT', time: dto.dailyAt!.time, timezone: dto.dailyAt?.timezone } as const;
    case 'WEEKLY_AT':
      return { type: 'WEEKLY_AT', weekday: dto.weeklyAt!.weekday, time: dto.weeklyAt!.time, timezone: dto.weeklyAt?.timezone } as const;
  }
}
