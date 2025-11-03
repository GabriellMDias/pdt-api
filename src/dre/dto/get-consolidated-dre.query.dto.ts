import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsNumber, IsDate, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetConsolidatedDreQueryDto {
  @ApiProperty({ type: [Number], example: [1, 2, 5], description: 'IDs de loja' })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v));
    // aceita "?storeId=1&storeId=2" ou "?storeId=1,2"
    return String(value).split(',').map((v) => Number(v.trim()));
  })
  storeId: number[];

  @ApiProperty({ type: [Number], example: [1, 2, 5], description: 'IDs de centro de custo' })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v));
    // aceita "?costCenerId=1&costCenerId=2" ou "?costCenerId=1,2"
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
