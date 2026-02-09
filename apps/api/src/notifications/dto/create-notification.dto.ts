import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  data?: Record<string, any>;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];
}
