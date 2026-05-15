import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyResultLineConfig,
  DailyResultLineFormat,
  DailyResultLineSourceType,
  Prisma,
} from '@prisma/client';

export class DailyResultLineConfigEntity implements DailyResultLineConfig {
  @ApiProperty()
  id: number;

  @ApiProperty()
  lineId: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ enum: DailyResultLineSourceType })
  sourceType: DailyResultLineSourceType;

  @ApiPropertyOptional({ enum: DailyResultLineFormat, nullable: true })
  format: DailyResultLineFormat | null;

  @ApiProperty()
  visible: boolean;

  @ApiProperty()
  bold: boolean;

  @ApiProperty()
  shade: boolean;

  @ApiPropertyOptional({ nullable: true })
  sourceConfig: Prisma.JsonValue | null;

  @ApiPropertyOptional({ nullable: true })
  calculationConfig: Prisma.JsonValue | null;

  @ApiPropertyOptional({ nullable: true })
  styleConfig: Prisma.JsonValue | null;

  @ApiPropertyOptional({ nullable: true })
  vrDreId: number | null;

  @ApiPropertyOptional({ nullable: true })
  vrDreItemId: number | null;

  @ApiPropertyOptional({ nullable: true })
  vrDreType: string | null;

  @ApiPropertyOptional({ nullable: true })
  vrDreTotalizationType: string | null;

  @ApiPropertyOptional({ nullable: true })
  detailConfig: Prisma.JsonValue | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
