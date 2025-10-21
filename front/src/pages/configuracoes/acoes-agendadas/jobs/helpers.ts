import type { Job } from "./types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function scheduleToText(s: Job): string {
  switch (s.scheduleType) {
    case "CRON":
      return `CRON ${s.cronExpression ?? ""}${s.timezone ? ` @ ${s.timezone}` : ""}`.trim();
    case "INTERVAL":
      return s.intervalSeconds ? `A cada ${s.intervalSeconds}s` : "Intervalo";
    case "DAILY_AT":
      return `Diário às ${s.dailyAtTime}${s.timezone ? ` @ ${s.timezone}` : ""}`;
    case "WEEKLY_AT":
      return `Semanal ${WEEKDAYS[(s.weeklyWeekday ?? 0)]} às ${s.weeklyTime}${s.timezone ? ` @ ${s.timezone}` : ""}`;
    default:
      return s.scheduleType;
  }
}
