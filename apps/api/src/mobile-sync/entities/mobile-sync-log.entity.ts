import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MobileSyncLogEntity {
  @ApiProperty()
  receiptId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  routineType!: string;

  @ApiProperty()
  routineLabel!: string;

  @ApiPropertyOptional()
  aggregateType!: string | null;

  @ApiPropertyOptional()
  aggregateKey!: string | null;

  @ApiPropertyOptional()
  storeId!: number | null;

  @ApiPropertyOptional()
  storeLabel!: string | null;

  @ApiProperty()
  userId!: number;

  @ApiPropertyOptional()
  userName!: string | null;

  @ApiPropertyOptional()
  userEmail!: string | null;

  @ApiPropertyOptional()
  userVrCode!: number | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  statusLabel!: string;

  @ApiProperty()
  result!: string;

  @ApiProperty()
  summary!: string;

  @ApiPropertyOptional()
  durationMs!: number | null;

  @ApiPropertyOptional()
  errorCode!: string | null;

  @ApiPropertyOptional()
  errorMessage!: string | null;

  @ApiPropertyOptional()
  deviceId!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  processedAt!: string | null;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: Object })
  requestPayload!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  responsePayload!: Record<string, unknown> | null;
}
