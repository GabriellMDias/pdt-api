import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsNumber, IsDate, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetNotConsolidatedDreQueryDto {
  @ApiProperty({ type: [Number], example: [1, 2, 5], description: 'IDs de loja' })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v));
    return String(value).split(',').map((v) => Number(v.trim()));
  })
  storeId: number[];

  @ApiProperty({ type: [Number], example: [1, 2, 5], description: 'IDs de centro de custo' })
  @IsArray()
  @ArrayNotEmpty()
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v));
    // aceita "?costCenterId=1&costCenterId=2" ou "?costCenterId=1,2"
    return String(value).split(',').map((v) => Number(v.trim()));
  })
  costCenterId?: number[];

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  initialDate: string;

  @ApiProperty({ example: '2025-10-26' })
  @IsDateString()
  finalDate: string;
}
