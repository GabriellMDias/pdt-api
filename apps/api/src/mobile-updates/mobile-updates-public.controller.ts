import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MobileUpdatesService } from './mobile-updates.service';
import { MobileUpdatesStorage } from './mobile-updates.storage';

@ApiTags('mobile-updates-public')
@Controller('mobile-updates/android')
export class MobileUpdatesPublicController {
  constructor(
    private readonly mobileUpdatesService: MobileUpdatesService,
    private readonly mobileUpdatesStorage: MobileUpdatesStorage,
  ) {}

  @Get('latest')
  @ApiOkResponse({ type: Object })
  async getLatestAndroidRelease(@Req() req: any) {
    return this.mobileUpdatesService.getLatestAndroidReleaseMetadata(req);
  }

  @Get('latest/download')
  async downloadLatestAndroidRelease(@Res() res: Response) {
    const latest = await this.mobileUpdatesService.getLatestPublishedAndroidReleaseOrThrow();
    const absolutePath = this.mobileUpdatesStorage.resolveAbsolutePath(latest.storagePath);

    return res.download(absolutePath, latest.downloadFilename);
  }
}
