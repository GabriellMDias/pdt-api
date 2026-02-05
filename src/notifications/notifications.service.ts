import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { userIds, ...data } = createNotificationDto;

    return this.prisma.notification.create({
      data: {
        ...data,
        recipients: {
          create: userIds.map((userId) => ({ userId })),
        },
      },
      include: { recipients: true },
    });
  }

  async findMyNotifications(userId: number) {
    return this.prisma.notificationRecipient.findMany({
      where: { userId },
      include: { notification: true },
      orderBy: { notification: { createdAt: 'desc' } },
    });
  }

  async markAsRead(userId: number, notificationId: number, read: boolean) {
    const readAt = read ? new Date() : null;
    return this.prisma.notificationRecipient.update({
      where: { notificationId_userId: { notificationId, userId } },
      data: { readAt },
    });
  }

  async notifyCostCenterTypeCreated(costCenterTypeId: number, userIds: number[]) {
    if (userIds.length === 0) return null;

    return this.create({
      type: 'cost-center-type.created',
      title: 'Novo tipo de centro de custo criado',
      message: `Um novo tipo de centro de custo foi criado e precisa de rateio configurado.`,
      data: { costCenterTypeId },
      userIds,
    });
  }
}
