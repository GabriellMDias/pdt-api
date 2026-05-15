import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class DailyResultEditValueChangeDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  costCenterId: number;

  @ApiPropertyOptional({ example: 'recBruta' })
  @IsOptional()
  @IsString()
  lineId?: string;

  @ApiPropertyOptional({ example: 'recBruta' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiProperty({ example: 12500.45 })
  @IsNumber()
  @Type(() => Number)
  value: number;
}

export class UpdateDailyResultEditValuesDto {
  @ApiProperty({ example: '2026-05' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  month: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  storeId: number;

  @ApiProperty({ type: [DailyResultEditValueChangeDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DailyResultEditValueChangeDto)
  changes: DailyResultEditValueChangeDto[];
}
