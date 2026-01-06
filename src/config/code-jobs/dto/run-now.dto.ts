import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RunNowDto {
  @ApiPropertyOptional({ example: 'execução manual para verificação' })
  @IsOptional() @IsString() reason?: string;
}
