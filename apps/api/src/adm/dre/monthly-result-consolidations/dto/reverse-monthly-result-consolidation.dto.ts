import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class ReverseMonthlyResultConsolidationDto {
  @ApiProperty({ example: '2026-03-01' })
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  month: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  storeId: number;

  @ApiPropertyOptional({ example: 'Estorno solicitado pela conferência mensal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
