import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResumoDiaQueryDto {
  @ApiProperty({ type: [Number], example: [5, 7], description: 'Lista de IDs de loja' })
  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === 'string') return value.split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v));
    return [];
  })
  lojas!: number[];

  @ApiProperty({ example: '2025-07-29', description: 'Data (YYYY-MM-DD)' })
  @IsDateString()
  data!: string;
}
