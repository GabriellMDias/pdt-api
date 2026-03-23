import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { Permissions, PermissionsAny } from 'src/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import { UpdateMobileReleaseDto } from './dto/update-mobile-release.dto';
import { MobileUpdatesService } from './mobile-updates.service';
import { MobileUpdatesStorage } from './mobile-updates.storage';

const tempUploadDir = resolve(process.cwd(), 'uploads', 'mobile-updates', 'tmp');
mkdirSync(tempUploadDir, { recursive: true });

function tempApkStorage() {
  return diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(tempUploadDir, { recursive: true });
      callback(null, tempUploadDir);
    },
    filename: (_req, file, callback) => {
      const extension = extname(file.originalname || '').toLowerCase() || '.apk';
      callback(
        null,
        `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}${extension}`,
      );
    },
  });
}

@ApiTags('mobile-updates-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mobile-updates/android')
export class MobileUpdatesAdminController {
  constructor(
    private readonly mobileUpdatesService: MobileUpdatesService,
    private readonly mobileUpdatesStorage: MobileUpdatesStorage,
  ) {}

  @Get('releases')
  @PermissionsAny(
    'mobile-releases:consultar',
    'mobile-releases:publicar',
    'mobile-releases:baixar',
  )
  @ApiOkResponse({ type: Object, isArray: true })
  async listAndroidReleases(@Req() req: any) {
    return this.mobileUpdatesService.listAndroidReleases(req);
  }

  @Post('releases')
  @Permissions('mobile-releases:publicar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: tempApkStorage(),
      limits: {
        fileSize: 512 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        versionName: { type: 'string', example: '1.2.1' },
        buildNumber: { type: 'integer', example: 10201 },
        changelog: { type: 'string' },
        required: { type: 'boolean' },
        publishNow: { type: 'boolean' },
      },
      required: ['file', 'versionName', 'buildNumber'],
    },
  })
  async uploadAndroidRelease(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMobileReleaseDto,
    @Req() req: any,
  ) {
    try {
      return await this.mobileUpdatesService.createAndroidRelease({
        file,
        dto,
        createdByUserId: Number(req.user?.id ?? 0) || null,
        req,
      });
    } finally {
      await this.mobileUpdatesStorage.deleteTempUpload(file);
    }
  }

  @Patch('releases/:id')
  @Permissions('mobile-releases:publicar')
  @ApiOkResponse({ type: Object })
  async updateAndroidRelease(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMobileReleaseDto,
    @Req() req: any,
  ) {
    return this.mobileUpdatesService.updateAndroidRelease(id, dto, req);
  }

  @Get('releases/:id/download')
  @PermissionsAny(
    'mobile-releases:consultar',
    'mobile-releases:publicar',
    'mobile-releases:baixar',
  )
  async downloadAndroidRelease(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const release = await this.mobileUpdatesService.getAndroidReleaseDownload(id);
    const absolutePath = this.mobileUpdatesStorage.resolveAbsolutePath(release.storagePath);

    return res.download(absolutePath, release.downloadFilename);
  }
}
