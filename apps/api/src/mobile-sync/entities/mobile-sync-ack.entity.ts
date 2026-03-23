import { ApiProperty } from '@nestjs/swagger';

export class MobileSyncAckSummaryEntity {
  @ApiProperty()
  processed: number;

  @ApiProperty()
  duplicates: number;

  @ApiProperty()
  temporaryErrors: number;

  @ApiProperty()
  permanentErrors: number;
}

export class MobileSyncEventAckEntity {
  @ApiProperty({ example: '6d35fc53-c87e-4766-b3f6-70d43f112f8c' })
  eventId: string;

  @ApiProperty({
    enum: ['processed', 'duplicate', 'temporary_error', 'permanent_error'],
  })
  status: 'processed' | 'duplicate' | 'temporary_error' | 'permanent_error';

  @ApiProperty()
  receiptId: string;

  @ApiProperty({ required: false, nullable: true })
  processedAt: string | null;

  @ApiProperty({ required: false, nullable: true })
  errorCode: string | null;

  @ApiProperty({ required: false, nullable: true })
  errorMessage: string | null;

  @ApiProperty()
  retryable: boolean;
}

export class MobileSyncPushResponseEntity {
  @ApiProperty({ type: MobileSyncEventAckEntity, isArray: true })
  acknowledgements: MobileSyncEventAckEntity[];

  @ApiProperty({ type: MobileSyncAckSummaryEntity })
  summary: MobileSyncAckSummaryEntity;
}
