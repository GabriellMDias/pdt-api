export type AndroidReleaseMetadata = {
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

export type InstalledAndroidVersion = {
  versionName: string;
  buildNumber: number;
  applicationId: string | null;
};

export type DownloadedApkInfo = {
  fileUri: string;
  contentUri: string;
};
