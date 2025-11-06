import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsNumber, IsDate, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

const toBool = (value: any) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (['1','true','t','yes','y','on'].includes(s)) return true;
  if (['0','false','f','no','n','off',''].includes(s)) return false;
  return Boolean(value);
};

export class GetLossAndConsumptionQueryDto {
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
  @IsOptional()
  @IsNumber({}, { each: true })
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

  @ApiPropertyOptional({ description: 'Considerar valores negativos (default: usa parâmetro do sistema)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBool(value))
  considerNegativeValues?: boolean;
}