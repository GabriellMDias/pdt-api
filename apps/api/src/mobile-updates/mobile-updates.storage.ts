import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { mkdir, readFile, rename, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

type FinalizeUploadResult = {
  storagePath: string;
  absolutePath: string;
  downloadFilename: string;
  mimeType: string;
  fileSizeBytes: bigint;
  sha256: string;
};

const APK_MIME_TYPES = new Set([
  'application/vnd.android.package-archive',
  'application/octet-stream',
  'application/zip',
]);

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

@Injectable()
export class MobileUpdatesStorage {
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads', 'mobile-updates');

  getTempUploadsDir(): string {
    return join(this.uploadsRoot, 'tmp');
  }

  getAndroidUploadsDir(): string {
    return join(this.uploadsRoot, 'android');
  }

  resolveAbsolutePath(storagePath: string): string {
    return resolve(process.cwd(), 'uploads', storagePath);
  }

  async ensureDirectories(): Promise<void> {
    await mkdir(this.getTempUploadsDir(), { recursive: true });
    await mkdir(this.getAndroidUploadsDir(), { recursive: true });
  }

  async finalizeAndroidUpload(params: {
    file: Express.Multer.File;
    versionName: string;
    buildNumber: number;
  }): Promise<FinalizeUploadResult> {
    await this.ensureDirectories();

    this.assertLooksLikeApk(params.file);

    const fileBuffer = await readFile(params.file.path);
    const signature = fileBuffer.subarray(0, 2).toString('utf8');
    if (signature !== 'PK') {
      throw new BadRequestException(
        'O arquivo enviado nao parece ser uma APK valida.',
      );
    }

    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const fileStats = await stat(params.file.path);
    const downloadFilename = `pdt-mobile-${params.versionName}+${params.buildNumber}.apk`;
    const storedFilename = `${Date.now()}-${params.buildNumber}-${slugify(params.versionName)}.apk`;
    const relativeStoragePath = ['mobile-updates', 'android', storedFilename].join('/');
    const absoluteTargetPath = join(this.getAndroidUploadsDir(), storedFilename);

    try {
      await rename(params.file.path, absoluteTargetPath);
    } catch (error) {
      throw new InternalServerErrorException(
        `Nao foi possivel mover a APK enviada para o armazenamento final. ${
          error instanceof Error ? error.message : ''
        }`.trim(),
      );
    }

    return {
      storagePath: relativeStoragePath,
      absolutePath: absoluteTargetPath,
      downloadFilename,
      mimeType:
        params.file.mimetype && APK_MIME_TYPES.has(params.file.mimetype)
          ? params.file.mimetype
          : 'application/vnd.android.package-archive',
      fileSizeBytes: BigInt(fileStats.size),
      sha256,
    };
  }

  async deleteStoredFile(storagePath: string | null | undefined): Promise<void> {
    if (!storagePath) return;

    const absolutePath = this.resolveAbsolutePath(storagePath);
    if (!existsSync(absolutePath)) return;
    await rm(absolutePath, { force: true });
  }

  async deleteTempUpload(file: Express.Multer.File | null | undefined): Promise<void> {
    if (!file?.path) return;
    if (!existsSync(file.path)) return;
    await rm(file.path, { force: true });
  }

  private assertLooksLikeApk(file: Express.Multer.File) {
    const originalName = String(file.originalname ?? '').trim().toLowerCase();
    if (!originalName.endsWith('.apk')) {
      throw new BadRequestException('Envie um arquivo APK valido.');
    }

    if (file.size <= 0) {
      throw new BadRequestException('O arquivo APK enviado esta vazio.');
    }
  }
}
