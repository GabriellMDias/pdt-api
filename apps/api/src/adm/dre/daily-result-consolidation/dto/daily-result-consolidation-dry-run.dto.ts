import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class DailyResultConsolidationDryRunDto {
  @ApiPropertyOptional({ example: '2026-03-01' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  month: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  storeId: number;

  @ApiPropertyOptional({ example: ['recBruta'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.map((item) => String(item));
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  lineIds?: string[];
}
