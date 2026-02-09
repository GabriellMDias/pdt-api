import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationEntity, NotificationRecipientEntity } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOkResponse({ schema: { example: { items: [{ id: 1 }], page: 1, pageSize: 10, total: 1, totalPages: 1, unreadCount: 1 } } })
  findMine(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNumber = Math.max(1, Number(page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(limit ?? 10)));
    return this.notificationsService.findMyNotifications(Number(req.user?.id), pageNumber, pageSize);
  }

  @Sse('stream')
  stream(@Req() req: any) {
    return this.notificationsService.stream(Number(req.user?.id));
  }

  @Patch(':notificationId/read')
  @ApiOkResponse({ type: NotificationRecipientEntity })
  markRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Body() dto: MarkNotificationReadDto,
    @Req() req: any
  ) {
    return this.notificationsService.markAsRead(Number(req.user?.id), notificationId, dto.read);
  }

  @Patch('me/read-all')
  @ApiOkResponse({ schema: { example: { count: 3 } } })
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(Number(req.user?.id));
  }

  @Delete(':notificationId')
  @ApiOkResponse({ schema: { example: { count: 1 } } })
  deleteNotification(@Param('notificationId', ParseIntPipe) notificationId: number, @Req() req: any) {
    return this.notificationsService.deleteForUser(Number(req.user?.id), notificationId);
  }

  @Post()
  @ApiCreatedResponse({ type: NotificationEntity })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}
