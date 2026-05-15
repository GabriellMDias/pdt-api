import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyResultLineFormat,
  DailyResultLineSourceType,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDailyResultLineConfigDto {
  @ApiProperty({ example: 'recBruta' })
  @IsString()
  @IsNotEmpty()
  lineId: string;

  @ApiProperty({ example: 'RECEITA BRUTA DE VENDAS' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  order: number;

  @ApiProperty({ enum: DailyResultLineSourceType })
  @IsEnum(DailyResultLineSourceType)
  sourceType: DailyResultLineSourceType;

  @ApiPropertyOptional({ enum: DailyResultLineFormat, nullable: true })
  @IsOptional()
  @IsEnum(DailyResultLineFormat)
  format?: DailyResultLineFormat | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  bold?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shade?: boolean;

  @ApiPropertyOptional({
    example: {
      sourceField: 'recBruta',
      distributionStrategy: 'PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT',
    },
    nullable: true,
  })
  @IsOptional()
  sourceConfig?: unknown;

  @ApiPropertyOptional({
    example: { terms: [{ lineKey: 'recBruta', multiplier: 1 }] },
    nullable: true,
  })
  @IsOptional()
  calculationConfig?: unknown;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  styleConfig?: unknown;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  vrDreId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  vrDreItemId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  vrDreType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  vrDreTotalizationType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  detailConfig?: unknown;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
