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
