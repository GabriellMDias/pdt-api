import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  Matches,
} from 'class-validator';

export class GetMonthlyResultConsolidationsQueryDto {
  @ApiProperty({ example: '2026-01' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  initialMonth: string;

  @ApiProperty({ example: '2026-05' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  finalMonth: string;

  @ApiProperty({ type: [Number], example: [1, 2, 5] })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((item) => Number(item));
    return String(value)
      .split(',')
      .map((item) => Number(item.trim()));
  })
  storeIds: number[];
}
