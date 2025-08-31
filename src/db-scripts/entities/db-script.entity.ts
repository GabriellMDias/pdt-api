import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptRunStatus, ScriptScheduleType } from '@prisma/client';

export class DbScriptEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Pontuação Vantagem — Loja 1 (horária)' })
  name!: string;

  @ApiPropertyOptional({ example: 'Varredura de vendas do dia para inclusão de pontos.' })
  description?: string | null;

  @ApiProperty({
    description: 'Conteúdo SQL/PLpgSQL a ser executado',
    example: "DO $$ BEGIN RAISE NOTICE 'hello'; END $$ LANGUAGE plpgsql;",
  })
  sqlText!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ enum: ScriptScheduleType, example: ScriptScheduleType.CRON })
  scheduleType!: ScriptScheduleType;

  @ApiPropertyOptional({
    description: 'Expressão CRON (6 campos: sec min hora dia mês dow)',
    example: '0 0 * * * *',
  })
  cronExpression?: string | null;

  @ApiPropertyOptional({ description: 'Intervalo puro (segundos)', example: 3600 })
  intervalSeconds?: number | null;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ description: 'Timeout de execução em segundos', example: 600 })
  timeoutSec!: number;

  @ApiProperty({ description: 'Encapsular execução em transação', example: false })
  wrapInTransaction!: boolean;

  @ApiPropertyOptional({ description: 'search_path opcional', example: 'public, pdv, connect' })
  searchPath?: string | null;

  @ApiPropertyOptional({ enum: ScriptRunStatus, example: ScriptRunStatus.SUCCESS })
  lastStatus?: ScriptRunStatus | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  latestRunAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
