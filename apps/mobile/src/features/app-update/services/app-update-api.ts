import { ENV } from '@/src/config/env';
import type { AndroidReleaseMetadata } from '@/src/features/app-update/types';

function buildLatestMetadataUrl() {
  return `${ENV.API_URL}/mobile-updates/android/latest`;
}

export async function fetchLatestAndroidReleaseMetadata(
  timeoutMs = 3500,
): Promise<AndroidReleaseMetadata | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildLatestMetadataUrl(), {
      method: 'GET',
      signal: controller.signal,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Falha ao consultar a ultima APK (${response.status}).`);
    }

    const payload = (await response.json()) as Partial<AndroidReleaseMetadata>;
    if (!payload.versionName || !payload.downloadUrl) {
      return null;
    }

    return {
      platform: 'android',
      versionName: String(payload.versionName),
      buildNumber: Number(payload.buildNumber ?? 0),
      required: Boolean(payload.required),
      publishedAt: payload.publishedAt ? String(payload.publishedAt) : null,
      changelog: payload.changelog ? String(payload.changelog) : null,
      downloadUrl: String(payload.downloadUrl),
      sha256: payload.sha256 ? String(payload.sha256) : '',
      fileSizeBytes: Number(payload.fileSizeBytes ?? 0),
    };
  } finally {
    clearTimeout(timeout);
  }
}
