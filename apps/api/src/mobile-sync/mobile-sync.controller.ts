import { Body, Controller, HttpCode, Logger, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PullMobileSyncCatalogDto } from './dto/pull-mobile-sync-catalog.dto';
import { PushMobileSyncEventsDto } from './dto/push-mobile-sync-events.dto';
import { MobileSyncPushResponseEntity } from './entities/mobile-sync-ack.entity';
import { MobileSyncCatalogPullResponseEntity } from './entities/mobile-sync-catalog.entity';
import { MobileSyncCatalogService } from './mobile-sync.catalog.service';
import { MobileSyncService } from './mobile-sync.service';

@Controller('mobile-sync')
@ApiTags('mobile-sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MobileSyncController {
  private readonly logger = new Logger(MobileSyncController.name);

  constructor(
    private readonly mobileSyncService: MobileSyncService,
    private readonly mobileSyncCatalogService: MobileSyncCatalogService,
  ) {}

  @Post('events/push')
  @HttpCode(200)
  @ApiOkResponse({ type: MobileSyncPushResponseEntity })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  async pushEvents(@Req() req: any, @Body() dto: PushMobileSyncEventsDto) {
    const startedAtMs = Date.now();
    const response = await this.mobileSyncService.pushEvents(
      {
        id: req.user.id,
        email: req.user.email,
        permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [],
        codigoUsuarioVrMaster: req.user.codigoUsuarioVrMaster,
      },
      dto,
    );

    this.logger.log(
      JSON.stringify({
        action: 'pushEvents',
        userId: req.user.id,
        eventsCount: Array.isArray(dto.events) ? dto.events.length : 0,
        durationMs: Date.now() - startedAtMs,
        summary: response.summary,
      }),
    );

    return response;
  }

  @Post('catalog/pull')
  @HttpCode(200)
  @ApiOkResponse({ type: MobileSyncCatalogPullResponseEntity })
  @ApiBadRequestResponse({ description: 'Payload invalido.' })
  async pullCatalog(@Req() req: any, @Body() dto: PullMobileSyncCatalogDto) {
    const startedAtMs = Date.now();
    const response = await this.mobileSyncCatalogService.pullCatalog(
      {
        id: req.user.id,
        email: req.user.email,
        permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [],
        codigoUsuarioVrMaster: req.user.codigoUsuarioVrMaster,
      },
      dto,
    );

    this.logger.log(
      JSON.stringify({
        action: 'pullCatalog',
        userId: req.user.id,
        domain: dto.domain,
        storeId: dto.storeId,
        itemsCount: Array.isArray(response.items) ? response.items.length : 0,
        durationMs: Date.now() - startedAtMs,
      }),
    );

    return response;
  }
}
