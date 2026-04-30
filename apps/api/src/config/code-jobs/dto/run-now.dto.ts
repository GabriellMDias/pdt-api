import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class RunNowDto {
  @ApiPropertyOptional({ example: 'execucao manual para verificacao' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { initialDate: '2026-04-01', finalDate: '2026-04-30' },
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
