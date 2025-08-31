import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArquivoAnaliseQueryDto {
  @IsOptional()
  @IsString()
  storeIds?: string; // "1,2,3"

  @ApiProperty({ example: '2025-07-29', description: 'Data inicial (YYYY-MM-DD)' })
  @IsDateString()
  initialDate!: string;

  @ApiProperty({ example: '2025-07-31', description: 'Data final (YYYY-MM-DD)' })
  @IsDateString()
  finalDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}