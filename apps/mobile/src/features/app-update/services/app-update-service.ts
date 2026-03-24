import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { ENV } from '@/src/config/env';
import type {
  AndroidReleaseMetadata,
  DownloadedApkInfo,
  InstalledAndroidVersion,
} from '@/src/features/app-update/types';

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;
const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const INSTALL_PACKAGE_ACTION = 'android.intent.action.INSTALL_PACKAGE';

async function assertDownloadedApkLooksValid(fileUri: string) {
  if (!fileUri?.startsWith('file://')) {
    throw new Error('A APK baixada nao ficou em um caminho local valido.');
  }

  if (!fileUri.toLowerCase().endsWith('.apk')) {
    throw new Error('O arquivo baixado nao possui extensao .apk.');
  }

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || fileInfo.isDirectory) {
    throw new Error('A APK baixada nao foi encontrada no armazenamento local.');
  }

  if (typeof fileInfo.size === 'number' && fileInfo.size <= 0) {
    throw new Error('A APK baixada esta vazia ou corrompida.');
  }
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number(part) || 0);
  const rightParts = right.split('.').map((part) => Number(part) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  return 0;
}

export function isNativeAndroidUpdateRuntimeSupported(): boolean {
  return (
    Platform.OS === 'android' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

export function getInstalledAndroidVersion(): InstalledAndroidVersion {
  const fallbackVersion = ENV.APP_VERSION_NAME;
  const fallbackBuildNumber = ENV.APP_BUILD_NUMBER;

  return {
    versionName:
      Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      fallbackVersion,
    buildNumber:
      Number(
        Application.nativeBuildVersion ??
          Constants.expoConfig?.android?.versionCode ??
          fallbackBuildNumber,
      ) || 0,
    applicationId:
      Application.applicationId ??
      ENV.ANDROID_PACKAGE ??
      null,
  };
}

export function hasAndroidUpdateAvailable(
  installed: InstalledAndroidVersion,
  latest: AndroidReleaseMetadata,
): boolean {
  if (latest.buildNumber > 0 && installed.buildNumber > 0) {
    return latest.buildNumber > installed.buildNumber;
  }

  return compareSemver(latest.versionName, installed.versionName) > 0;
}

export async function downloadAndroidApk(params: {
  metadata: AndroidReleaseMetadata;
  onProgress?: (fraction: number) => void;
}): Promise<DownloadedApkInfo> {
  if (!FileSystem.cacheDirectory) {
    throw new Error('O diretorio de cache do app nao esta disponivel.');
  }

  const updatesDirectory = `${FileSystem.cacheDirectory}updates/`;
  await FileSystem.makeDirectoryAsync(updatesDirectory, {
    intermediates: true,
  }).catch(() => undefined);

  const sanitizedVersion = params.metadata.versionName.replace(/[^0-9A-Za-z.-]/g, '-');
  const targetFileUri = `${updatesDirectory}pdt-mobile-${sanitizedVersion}+${params.metadata.buildNumber}.apk`;

  const downloadTask = FileSystem.createDownloadResumable(
    params.metadata.downloadUrl,
    targetFileUri,
    {},
    (progress) => {
      if (!params.onProgress) return;
      if (progress.totalBytesExpectedToWrite <= 0) {
        params.onProgress(0);
        return;
      }

      params.onProgress(
        progress.totalBytesWritten / progress.totalBytesExpectedToWrite,
      );
    },
  );

  const result = await downloadTask.downloadAsync();
  if (!result?.uri) {
    throw new Error('A APK foi baixada, mas o arquivo local nao ficou disponivel.');
  }

  await assertDownloadedApkLooksValid(result.uri);

  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  if (!contentUri?.startsWith('content://')) {
    throw new Error('Nao foi possivel expor a APK como content:// para o Android.');
  }

  return {
    fileUri: result.uri,
    contentUri,
  };
}

export async function launchAndroidApkInstaller(
  downloadedApk: DownloadedApkInfo,
): Promise<void> {
  await assertDownloadedApkLooksValid(downloadedApk.fileUri);

  if (!downloadedApk.contentUri?.startsWith('content://')) {
    throw new Error('A APK nao foi convertida para content:// antes da instalacao.');
  }

  await IntentLauncher.startActivityAsync(INSTALL_PACKAGE_ACTION, {
    data: downloadedApk.contentUri,
    type: APK_MIME_TYPE,
    flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
  });
}

export async function openUnknownSourcesSettings(): Promise<void> {
  const applicationId = getInstalledAndroidVersion().applicationId;
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
    {
      data: applicationId ? `package:${applicationId}` : undefined,
      flags: FLAG_ACTIVITY_NEW_TASK,
    },
  );
}

export async function openApkDownloadInBrowser(
  metadata: AndroidReleaseMetadata,
): Promise<void> {
  await WebBrowser.openBrowserAsync(metadata.downloadUrl);
}
