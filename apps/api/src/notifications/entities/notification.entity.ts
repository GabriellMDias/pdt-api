import { ApiProperty } from '@nestjs/swagger';

export class NotificationRecipientEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  notificationId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ required: false, type: String })
  readAt?: Date | null;
}

export class NotificationEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false, type: Object })
  data?: Record<string, any> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [NotificationRecipientEntity] })
  recipients: NotificationRecipientEntity[];
}
