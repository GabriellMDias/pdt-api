import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptRunStatus, ScriptScheduleType } from '@prisma/client';

export class CodeJobEntity {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() handler!: string;

  @ApiProperty({ enum: ScriptScheduleType }) scheduleType!: ScriptScheduleType;
  @ApiPropertyOptional() cronExpression?: string | null;
  @ApiPropertyOptional() intervalSeconds?: number | null;
  @ApiPropertyOptional() dailyAtTime?: string | null;
  @ApiPropertyOptional() weeklyWeekday?: number | null;
  @ApiPropertyOptional() weeklyTime?: string | null;

  @ApiPropertyOptional() timezone?: string | null;
  @ApiProperty() enabled!: boolean;

  @ApiPropertyOptional({ enum: ScriptRunStatus }) lastStatus?: ScriptRunStatus | null;
  @ApiPropertyOptional() latestRunAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
