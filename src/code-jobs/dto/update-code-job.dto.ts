import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScriptScheduleType } from '@prisma/client';

// —— Helpers de schedule (iguais ao db-scripts) ——
class CronScheduleDto {
  @ApiPropertyOptional({ description: 'CRON 5 ou 6 campos; se 5, adicionamos seconds=0', example: '0 */15 * * * *' })
  @IsString() cron!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

class IntervalScheduleDto {
  @ApiPropertyOptional({ description: 'Segundos', example: 900 })
  @IsInt() @Min(1) everySeconds!: number;
}

class DailyAtScheduleDto {
  @ApiPropertyOptional({ description: 'HH:mm', example: '09:00' })
  @IsString() time!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

class WeeklyAtScheduleDto {
  @ApiPropertyOptional({ description: '0-6 (Dom-Sáb)', example: 1 })
  @IsInt() weekday!: number;

  @ApiPropertyOptional({ description: 'HH:mm', example: '10:30' })
  @IsString() time!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

// —— Transform para boolean flexível (true/false, 'true'/'false', 1/0, '1'/'0') ——
const ToBoolean = () =>
  Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['true', '1', 'on', 'yes'].includes(v)) return true;
      if (['false', '0', 'off', 'no'].includes(v)) return false;
    }
    return value; // deixa passar (para não apagar quando vier undefined)
  });

export class UpdateCodeJobDto {
  // Só esses campos são editáveis pelo usuário
  @ApiPropertyOptional({ description: 'Ativar/Desativar job', example: true })
  @IsOptional() @IsBoolean() @ToBoolean() enabled?: boolean;

  // ——— Forma "amigável" de agendamento ———
  @ApiPropertyOptional({ enum: ScriptScheduleType, example: ScriptScheduleType.CRON })
  @IsOptional() @IsEnum(ScriptScheduleType) scheduleType?: ScriptScheduleType;

  @ApiPropertyOptional({ type: CronScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => CronScheduleDto) cron?: CronScheduleDto;

  @ApiPropertyOptional({ type: IntervalScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => IntervalScheduleDto) interval?: IntervalScheduleDto;

  @ApiPropertyOptional({ type: DailyAtScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => DailyAtScheduleDto) dailyAt?: DailyAtScheduleDto;

  @ApiPropertyOptional({ type: WeeklyAtScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => WeeklyAtScheduleDto) weeklyAt?: WeeklyAtScheduleDto;

  // ——— Forma “legado” (aceita direto no corpo) ———
  @ApiPropertyOptional({ description: 'CRON direto (6 campos)', example: '0 */10 * * * *' })
  @IsOptional() @IsString() cronExpression?: string;

  @ApiPropertyOptional({ description: 'Intervalo direto (segundos)', example: 1800 })
  @IsOptional() @IsInt() @Min(1) intervalSeconds?: number;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}
