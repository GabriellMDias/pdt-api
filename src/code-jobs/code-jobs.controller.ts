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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { UpdateCodeJobDto } from './dto/update-code-job.dto';
import { ScriptRunStatus } from '@prisma/client';

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
