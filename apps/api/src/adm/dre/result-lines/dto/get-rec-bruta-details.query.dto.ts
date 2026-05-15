import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsNumber, IsOptional } from 'class-validator';

function parseNumberArray(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map((item) => Number(item));
  return String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

export class GetRecBrutaDetailsQueryDto {
  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  initialDate: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  finalDate: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 5] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => parseNumberArray(value))
  storeIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [1, 5] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => parseNumberArray(value))
  storeId?: number[];

  @ApiPropertyOptional({ type: [Number], example: [3, 8, 9] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => parseNumberArray(value))
  costCenterIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [3, 8, 9] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => parseNumberArray(value))
  costCenterId?: number[];
}
