import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScriptScheduleType } from '@prisma/client';

class CronScheduleDto {
  @ApiProperty({ description: 'CRON 5 ou 6 campos. Se 5, adicionamos seconds=0', example: '0 0 * * * *' })
  @IsString() cron!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

class IntervalScheduleDto {
  @ApiProperty({ description: 'Segundos', example: 3600 })
  @IsInt() @Min(1) everySeconds!: number;
}

class DailyAtScheduleDto {
  @ApiProperty({ description: 'HH:mm', example: '09:00' })
  @IsString() time!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

class WeeklyAtScheduleDto {
  @ApiProperty({ description: '0-6 (Dom-Sáb)', example: 2 })
  @IsInt() weekday!: number;

  @ApiProperty({ description: 'HH:mm', example: '10:30' })
  @IsString() time!: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional() @IsString() timezone?: string;
}

export class CreateDbScriptDto {
  @ApiProperty({ example: 'Testeee' })
  @IsString() @IsNotEmpty() name!: string;

  @ApiPropertyOptional({ example: 'Teste.' })
  @IsOptional() @IsString() description?: string;

  @ApiProperty({
    description: 'SQL/PLpgSQL a executar',
    example: "DO $$ BEGIN RAISE NOTICE 'ok'; END $$ LANGUAGE plpgsql;",
  })
  @IsString() @IsNotEmpty() sqlText!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() enabled?: boolean = true;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() wrapInTransaction?: boolean = false;

  @ApiPropertyOptional({ example: 'public' })
  @IsOptional() @IsString() searchPath?: string;

  @ApiPropertyOptional({ description: 'Timeout (segundos)', example: 600 })
  @IsOptional() @IsInt() @Min(1) timeoutSec?: number = 600;

  @ApiProperty({ enum: ScriptScheduleType, example: ScriptScheduleType.CRON })
  @IsEnum(ScriptScheduleType) scheduleType!: ScriptScheduleType;

  @ApiPropertyOptional({ type: CronScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => CronScheduleDto) cron?: CronScheduleDto;

  @ApiPropertyOptional({ type: IntervalScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => IntervalScheduleDto) interval?: IntervalScheduleDto;

  @ApiPropertyOptional({ type: DailyAtScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => DailyAtScheduleDto) dailyAt?: DailyAtScheduleDto;

  @ApiPropertyOptional({ type: WeeklyAtScheduleDto })
  @IsOptional() @ValidateNested() @Type(() => WeeklyAtScheduleDto) weeklyAt?: WeeklyAtScheduleDto;
}
