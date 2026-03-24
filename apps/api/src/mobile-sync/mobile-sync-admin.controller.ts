import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ListMobileSyncLogsQueryDto } from './dto/list-mobile-sync-logs.query.dto';
import { PaginatedMobileSyncLogsEntity } from './entities/paginated-mobile-sync-logs.entity';
import { MobileSyncLogsService } from './mobile-sync-logs.service';

@ApiTags('mobile-sync-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mobile-sync')
export class MobileSyncAdminController {
  constructor(private readonly mobileSyncLogsService: MobileSyncLogsService) {}

  @Get('logs')
  @Permissions('mobile-sync-logs:consultar')
  @ApiOkResponse({ type: PaginatedMobileSyncLogsEntity })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listLogs(@Query() dto: ListMobileSyncLogsQueryDto, @Req() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? 0);
    return this.mobileSyncLogsService.listLogs(userId, dto);
  }

  @Get('logs/users')
  @Permissions('mobile-sync-logs:consultar')
  @ApiOkResponse({ type: Object, isArray: true })
  async listAvailableUsers(@Req() req: any) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? 0);
    return this.mobileSyncLogsService.listAvailableUsers(userId);
  }
}
