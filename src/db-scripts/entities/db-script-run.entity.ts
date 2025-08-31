import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptRunStatus } from '@prisma/client';

export class DbScriptRunEntity {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 1 })
  scriptId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  finishedAt?: Date | null;

  @ApiProperty({ enum: ScriptRunStatus, example: ScriptRunStatus.SUCCESS })
  status!: ScriptRunStatus;

  @ApiPropertyOptional({ description: 'rowCount da última instrução (quando aplicável)', example: 1 })
  rowsAffected?: number | null;

  @ApiPropertyOptional({ description: 'Mensagem de erro (máx. 4000 chars)' })
  error?: string | null;

  @ApiPropertyOptional({ description: 'Duração em ms', example: 153 })
  durationMs?: number | null;

  @ApiPropertyOptional({ description: "Origem do disparo: 'SCHEDULE' | 'MANUAL' | 'RETRY'", example: 'SCHEDULE' })
  triggeredBy?: string | null;

  @ApiPropertyOptional({ description: 'Identificador da instância que executou', example: 'host-1:12345' })
  appInstanceId?: string | null;
}
