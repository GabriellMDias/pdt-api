import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MobileAppPlatform, MobileAppRelease } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import { UpdateMobileReleaseDto } from './dto/update-mobile-release.dto';
import { MobileUpdatesStorage } from './mobile-updates.storage';

type RequestLike = {
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
  get?: (headerName: string) => string | undefined;
};

type ReleaseView = {
  id: number;
  platform: 'android';
  versionName: string;
  buildNumber: number;
  changelog: string | null;
  isPublished: boolean;
  isLatest: boolean;
  isRequired: boolean;
  publishedAt: string | null;
  createdAt: string;
  originalFilename: string;
  downloadFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  downloadUrl: string;
  latestDownloadUrl: string;
  createdByUserId: number | null;
  createdByUserName: string | null;
};

type LatestReleaseMetadata = {
  platform: 'android';
  versionName: string;
  buildNumber: number;
  required: boolean;
  publishedAt: string | null;
  changelog: string | null;
  downloadUrl: string;
  sha256: string;
  fileSizeBytes: number;
};

@Injectable()
export class MobileUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MobileUpdatesStorage,
  ) {}

  async listAndroidReleases(req: RequestLike): Promise<ReleaseView[]> {
    const releases = await this.prisma.mobileAppRelease.findMany({
      where: { platform: MobileAppPlatform.ANDROID },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ buildNumber: 'desc' }, { createdAt: 'desc' }],
    });

    return releases.map((release) => this.serializeRelease(release, req));
  }

  async createAndroidRelease(params: {
    file: Express.Multer.File;
    dto: CreateMobileReleaseDto;
    createdByUserId: number | null;
    req: RequestLike;
  }): Promise<ReleaseView> {
    const existing = await this.prisma.mobileAppRelease.findUnique({
      where: {
        platform_buildNumber: {
          platform: MobileAppPlatform.ANDROID,
          buildNumber: params.dto.buildNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ja existe uma release Android com build ${params.dto.buildNumber}.`,
      );
    }

    const finalized = await this.storage.finalizeAndroidUpload({
      file: params.file,
      versionName: params.dto.versionName,
      buildNumber: params.dto.buildNumber,
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (params.dto.publishNow) {
          await tx.mobileAppRelease.updateMany({
            where: {
              platform: MobileAppPlatform.ANDROID,
              isLatest: true,
            },
            data: {
              isLatest: false,
            },
          });
        }

        return tx.mobileAppRelease.create({
          data: {
            platform: MobileAppPlatform.ANDROID,
            versionName: params.dto.versionName,
            buildNumber: params.dto.buildNumber,
            storagePath: finalized.storagePath,
            downloadFilename: finalized.downloadFilename,
            originalFilename: params.file.originalname,
            mimeType: finalized.mimeType,
            fileSizeBytes: finalized.fileSizeBytes,
            sha256: finalized.sha256,
            changelog: params.dto.changelog?.trim() || null,
            isPublished: Boolean(params.dto.publishNow),
            isLatest: Boolean(params.dto.publishNow),
            isRequired: Boolean(params.dto.required),
            publishedAt: params.dto.publishNow ? new Date() : null,
            createdByUserId: params.createdByUserId,
          },
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      return this.serializeRelease(created, params.req);
    } catch (error) {
      await this.storage.deleteStoredFile(finalized.storagePath);
      throw error;
    }
  }

  async updateAndroidRelease(
    id: number,
    dto: UpdateMobileReleaseDto,
    req: RequestLike,
  ): Promise<ReleaseView> {
    const current = await this.prisma.mobileAppRelease.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!current || current.platform !== MobileAppPlatform.ANDROID) {
      throw new NotFoundException('Release Android nao encontrada.');
    }

    const nextIsPublished = dto.isPublished ?? current.isPublished;
    const nextIsLatest = dto.isLatest ?? current.isLatest;
    const effectiveIsLatest = nextIsLatest && nextIsPublished;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (effectiveIsLatest) {
        await tx.mobileAppRelease.updateMany({
          where: {
            platform: MobileAppPlatform.ANDROID,
            isLatest: true,
            id: { not: current.id },
          },
          data: {
            isLatest: false,
          },
        });
      }

      return tx.mobileAppRelease.update({
        where: { id: current.id },
        data: {
          changelog: dto.changelog === undefined ? current.changelog : dto.changelog?.trim() || null,
          isPublished: nextIsPublished,
          isLatest: effectiveIsLatest,
          isRequired: dto.isRequired ?? current.isRequired,
          publishedAt: nextIsPublished
            ? current.publishedAt ?? new Date()
            : null,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    return this.serializeRelease(updated, req);
  }

  async getLatestAndroidReleaseMetadata(
    req: RequestLike,
  ): Promise<LatestReleaseMetadata> {
    const latest = await this.getLatestPublishedAndroidRelease();
    if (!latest) {
      throw new NotFoundException('Nenhuma APK Android publicada no momento.');
    }

    return {
      platform: 'android',
      versionName: latest.versionName,
      buildNumber: latest.buildNumber,
      required: latest.isRequired,
      publishedAt: latest.publishedAt?.toISOString() ?? null,
      changelog: latest.changelog,
      downloadUrl: this.buildAbsoluteUrl(req, '/api/mobile-updates/android/latest/download'),
      sha256: latest.sha256,
      fileSizeBytes: Number(latest.fileSizeBytes),
    };
  }

  async getLatestPublishedAndroidReleaseOrThrow(): Promise<MobileAppRelease> {
    const latest = await this.getLatestPublishedAndroidRelease();
    if (!latest) {
      throw new NotFoundException('Nenhuma APK Android publicada no momento.');
    }

    return latest;
  }

  async getAndroidReleaseDownload(id: number): Promise<MobileAppRelease> {
    const release = await this.prisma.mobileAppRelease.findUnique({
      where: { id },
    });

    if (!release || release.platform !== MobileAppPlatform.ANDROID) {
      throw new NotFoundException('Release Android nao encontrada.');
    }

    return release;
  }

  private async getLatestPublishedAndroidRelease(): Promise<MobileAppRelease | null> {
    return this.prisma.mobileAppRelease.findFirst({
      where: {
        platform: MobileAppPlatform.ANDROID,
        isPublished: true,
      },
      orderBy: [
        { isLatest: 'desc' },
        { publishedAt: 'desc' },
        { buildNumber: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  private serializeRelease(
    release: MobileAppRelease & {
      createdByUser?: { id: number; name: string } | null;
    },
    req: RequestLike,
  ): ReleaseView {
    return {
      id: release.id,
      platform: 'android',
      versionName: release.versionName,
      buildNumber: release.buildNumber,
      changelog: release.changelog,
      isPublished: release.isPublished,
      isLatest: release.isLatest,
      isRequired: release.isRequired,
      publishedAt: release.publishedAt?.toISOString() ?? null,
      createdAt: release.createdAt.toISOString(),
      originalFilename: release.originalFilename,
      downloadFilename: release.downloadFilename,
      mimeType: release.mimeType,
      fileSizeBytes: Number(release.fileSizeBytes),
      sha256: release.sha256,
      downloadUrl: this.buildAbsoluteUrl(
        req,
        `/api/mobile-updates/android/releases/${release.id}/download`,
      ),
      latestDownloadUrl: this.buildAbsoluteUrl(
        req,
        '/api/mobile-updates/android/latest/download',
      ),
      createdByUserId: release.createdByUser?.id ?? release.createdByUserId ?? null,
      createdByUserName: release.createdByUser?.name ?? null,
    };
  }

  private buildAbsoluteUrl(req: RequestLike, path: string): string {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const protocol =
      (Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto) ||
      req.protocol ||
      'https';
    const host = req.get?.('host') || req.headers?.host || '';
    return `${protocol}://${host}${path}`;
  }
}
