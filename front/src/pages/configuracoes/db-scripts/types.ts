// src/pages/configuracoes/db-scripts/types.ts

export type ScriptScheduleType = 'CRON' | 'INTERVAL' | 'DAILY_AT' | 'WEEKLY_AT';

export type DbScript = {
  id: number;
  name: string;
  description?: string | null;
  sqlText: string;

  enabled: boolean;

  scheduleType: ScriptScheduleType;
  cronExpression?: string | null;   // when CRON (always 6 fields on server)
  intervalSeconds?: number | null;  // when INTERVAL
  timezone?: string | null;         // when CRON/DAILY/WEEKLY
  dailyTime?: string | null;        // 'HH:mm' when DAILY_AT
  weeklyWeekday?: number | null;    // 0..6 (Sun..Sat) when WEEKLY_AT
  weeklyTime?: string | null;       // 'HH:mm' when WEEKLY_AT

  wrapInTransaction: boolean;
  searchPath?: string | null;
  timeoutSec?: number | null;

  createdAt?: string;
  updatedAt?: string;
};

export type DbScriptRun = {
  id: number;
  scriptId: number;
  startedAt: string;
  finishedAt?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  rowsAffected?: number | null;
  error?: string | null;
  durationMs?: number | null;
  triggeredBy?: 'SCHEDULE' | 'MANUAL' | 'RETRY' | null;
  appInstanceId?: string | null;
};

// ==== DTOs for create/update ====

export type CreateDbScriptDto =
  | {
      name: string;
      description?: string;
      sqlText: string;
      enabled?: boolean;
      wrapInTransaction?: boolean;
      searchPath?: string;
      timeoutSec?: number;
      scheduleType: 'CRON';
      cron: { cron: string; timezone?: string };
    }
  | {
      name: string;
      description?: string;
      sqlText: string;
      enabled?: boolean;
      wrapInTransaction?: boolean;
      searchPath?: string;
      timeoutSec?: number;
      scheduleType: 'INTERVAL';
      interval: { everySeconds: number };
    }
  | {
      name: string;
      description?: string;
      sqlText: string;
      enabled?: boolean;
      wrapInTransaction?: boolean;
      searchPath?: string;
      timeoutSec?: number;
      scheduleType: 'DAILY_AT';
      dailyAt: { time: string; timezone?: string };
    }
  | {
      name: string;
      description?: string;
      sqlText: string;
      enabled?: boolean;
      wrapInTransaction?: boolean;
      searchPath?: string;
      timeoutSec?: number;
      scheduleType: 'WEEKLY_AT';
      weeklyAt: { weekday: number; time: string; timezone?: string };
    };

export type UpdateDbScriptDto = Partial<CreateDbScriptDto> & {
  // allow updating with same structure; backend accepts partials
};
