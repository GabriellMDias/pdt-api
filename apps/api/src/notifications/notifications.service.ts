import { Injectable, type MessageEvent } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private readonly events$ = new Subject<{ userId: number; type: string; payload?: Record<string, any> }>();

  private emit(userId: number, type: string, payload?: Record<string, any>) {
    this.events$.next({ userId, type, payload });
  }

  stream(userId: number): Observable<MessageEvent> {
    const events$ = this.events$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ type: event.type, data: JSON.stringify(event.payload ?? {}) }))
    );

    const keepAlive$ = interval(25000).pipe(map(() => ({ type: 'ping', data: '' })));

    return merge(events$, keepAlive$);
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const { userIds, ...data } = createNotificationDto;

    const created = await this.prisma.notification.create({
      data: {
        ...data,
        recipients: {
          create: userIds.map((userId) => ({ userId })),
        },
      },
      include: { recipients: true },
    });

    created.recipients.forEach((recipient) => {
      this.emit(recipient.userId, 'notification.created', { notificationId: created.id });
    });

    return created;
  }

  async findMyNotifications(userId: number, page = 1, pageSize = 10) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
    const take = Math.min(100, safePageSize);
    const skip = (safePage - 1) * take;

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notificationRecipient.findMany({
        where: { userId },
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        skip,
        take,
      }),
      this.prisma.notificationRecipient.count({ where: { userId } }),
      this.prisma.notificationRecipient.count({ where: { userId, readAt: null } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take));

    return { items, page: safePage, pageSize: take, total, totalPages, unreadCount };
  }

  async markAsRead(userId: number, notificationId: number, read: boolean) {
    const readAt = read ? new Date() : null;
    const updated = await this.prisma.notificationRecipient.update({
      where: { notificationId_userId: { notificationId, userId } },
      data: { readAt },
    });
    this.emit(userId, 'notification.updated', { notificationId, read });
    return updated;
  }

  async markAllAsRead(userId: number) {
    const readAt = new Date();
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { userId, readAt: null },
      data: { readAt },
    });
    this.emit(userId, 'notification.updated', { readAll: true });
    return result;
  }

  async deleteForUser(userId: number, notificationId: number) {
    const result = await this.prisma.notificationRecipient.deleteMany({
      where: { userId, notificationId },
    });
    this.emit(userId, 'notification.deleted', { notificationId });
    return result;
  }

  async notifyCostCenterTypeCreated(costCenterTypeId: number, costCenterTypeDesc: string,userIds: number[]) {
    if (userIds.length === 0) return null;

    return this.create({
      type: 'cost-center-type.created',
      title: 'Novo tipo de centro de custo criado',
      message: `Um novo tipo de centro de custo foi criado e precisa de rateio configurado (${costCenterTypeId} - ${costCenterTypeDesc}).`,
      data: { costCenterTypeId },
      userIds,
    });
  }
}
