import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class MobileSyncEventDto {
  @IsUUID()
  @ApiProperty({ example: '6d35fc53-c87e-4766-b3f6-70d43f112f8c' })
  eventId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @ApiProperty({ example: 'mobile.noop' })
  eventType: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiProperty({ required: false, example: 'inventory' })
  aggregateType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false, example: 'inventory:store:1' })
  aggregateKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ required: false, example: 1 })
  storeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiProperty({ required: false, example: 'device-android-01' })
  deviceId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  schemaVersion: number;

  @IsObject()
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { message: 'hello' },
  })
  payload: Record<string, unknown>;
}

export class PushMobileSyncEventsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MobileSyncEventDto)
  @ApiProperty({ type: MobileSyncEventDto, isArray: true })
  events: MobileSyncEventDto[];
}
