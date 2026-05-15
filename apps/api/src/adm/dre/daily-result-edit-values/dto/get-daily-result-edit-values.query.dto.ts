import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';

export class GetDailyResultEditValuesQueryDto {
  @ApiProperty({ example: '2026-05' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  month: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  storeId: number;
}
