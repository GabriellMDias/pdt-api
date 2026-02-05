import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
  @ApiOkResponse({ type: NotificationRecipientEntity, isArray: true })
  findMine(@Req() req: any) {
    return this.notificationsService.findMyNotifications(Number(req.user?.id));
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

  @Post()
  @ApiCreatedResponse({ type: NotificationEntity })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}
