import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const MOBILE_SYNC_LOG_ROUTINE_TYPES = [
  'ruptura',
  'troca',
  'consumo',
  'producao',
  'balanco',
  'outro',
] as const;

export type MobileSyncLogRoutineType =
  (typeof MOBILE_SYNC_LOG_ROUTINE_TYPES)[number];

function toIntArray(value: unknown): number[] | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  const chunks = Array.isArray(value) ? value : [value];
  const parsed = chunks
    .flatMap((chunk) =>
      String(chunk)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);

  return parsed.length > 0 ? Array.from(new Set(parsed)) : undefined;
}

export class ListMobileSyncLogsQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Data inicial do log (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  initialDate?: string;

  @ApiPropertyOptional({
    example: '2026-03-24',
    description: 'Data final do log (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  finalDate?: string;

  @ApiPropertyOptional({ example: 12, description: 'Usuario do sistema web.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    enum: MOBILE_SYNC_LOG_ROUTINE_TYPES,
    description: 'Tipo da rotina mobile.',
  })
  @IsOptional()
  @IsIn(MOBILE_SYNC_LOG_ROUTINE_TYPES)
  routineType?: MobileSyncLogRoutineType;

  @ApiPropertyOptional({
    type: Number,
    isArray: true,
    example: [1, 5],
    description: 'Lojas filtradas. Aceita repeticao ou string separada por virgula.',
  })
  @IsOptional()
  @Transform(({ value }) => toIntArray(value))
  storeIds?: number[];

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
