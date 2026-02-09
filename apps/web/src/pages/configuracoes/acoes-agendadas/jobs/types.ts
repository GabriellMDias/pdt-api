export type JobScheduleType = 'CRON' | 'INTERVAL' | 'DAILY_AT' | 'WEEKLY_AT';

export type Job = {
  id: number;
  name: string;
  description?: string | null;
  handler?: string | null;
  enabled: boolean;
  timezone?: string | null;         // when CRON/DAILY/WEEKLY
  scheduleType: JobScheduleType;
  cronExpression?: string | null;   // when CRON (always 6 fields on server)
  intervalSeconds?: number | null;  // when INTERVAL
  dailyAtTime?: string | null;        // 'HH:mm' when DAILY_AT
  weeklyWeekday?: number | null;    // 0..6 (Sun..Sat) when WEEKLY_AT
  weeklyTime?: string | null;       // 'HH:mm' when WEEKLY_AT
  lastStatus?: string | null;
  latestRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobRun = {
  id: number;
  jobId: number;
  startedAt: string;
  finishedAt?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RUNNING';
  rowsAffected?: number | null;
  error?: string | null;
  durationMs?: number | null;
  source?: 'SCHEDULE' | 'MANUAL' | 'RETRY' | null;
  log?: string | null
};

// ==== DTOs for create/update ====

export type CreateJobDto =
  | {
      enabled?: boolean;
      scheduleType: 'CRON';
      cron: { cron: string; timezone?: string };
    }
  | {
      enabled?: boolean;
      scheduleType: 'INTERVAL';
      interval: { everySeconds: number };
    }
  | {
      enabled?: boolean;
      scheduleType: 'DAILY_AT';
      dailyAt: { time: string; timezone?: string };
    }
  | {
      enabled?: boolean;
      scheduleType: 'WEEKLY_AT';
      weeklyAt: { weekday: number; time: string; timezone?: string };
    };

export type UpdateJobDto = Partial<CreateJobDto> & {
  // allow updating with same structure; backend accepts partials
};

export type GoogleDriveBackupConfig = {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  hasFolderId: boolean;
  clientIdPreview: string | null;
  clientSecretPreview: string | null;
  refreshTokenPreview: string | null;
  folderId: string | null;
};

export type UpsertGoogleDriveBackupConfigDto = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  folderId?: string;
};

export type GoogleDriveOauthUrlRequest = {
  redirectUri: string;
  state?: string;
};

export type GoogleDriveOauthUrlResponse = {
  authUrl: string;
};

export type GoogleDriveOauthExchangeRequest = {
  code: string;
  redirectUri: string;
};

export type GoogleDriveBackupTestResult = {
  ok: boolean;
  folderId: string;
  folderName: string;
};

export type GoogleDriveFolder = {
  id: string;
  name: string;
  parents: string[];
};

export type GoogleDriveFolderList = {
  parentId: string;
  items: GoogleDriveFolder[];
  nextPageToken?: string | null;
};

export type GoogleDriveBackupFile = {
  id: string;
  name: string;
  createdTime?: string | null;
  sizeBytes?: number | null;
};

export type GoogleDriveBackupFileList = {
  folderId: string;
  items: GoogleDriveBackupFile[];
  nextPageToken?: string | null;
};

export type GoogleDriveBackupRestoreRequest = {
  fileId: string;
};

export type GoogleDriveBackupRestoreResult = {
  ok: boolean;
  fileId: string;
  fileName: string;
  database: string;
  restoredAt: string;
};
