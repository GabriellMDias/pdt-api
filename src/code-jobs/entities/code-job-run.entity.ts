import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptRunStatus } from '@prisma/client';

export class CodeJobRunEntity {
  @ApiProperty() id!: number;
  @ApiProperty() jobId!: number;
  @ApiProperty({ enum: ScriptRunStatus }) status!: ScriptRunStatus;
  @ApiProperty() source!: string; // SCHEDULE | MANUAL | RETRY
  @ApiProperty() startedAt!: Date;
  @ApiPropertyOptional() finishedAt?: Date | null;
  @ApiPropertyOptional() durationMs?: number | null;
  @ApiPropertyOptional({ type: Object }) log?: any;
  @ApiPropertyOptional() error?: string | null;
  @ApiProperty() createdAt!: Date;
}
