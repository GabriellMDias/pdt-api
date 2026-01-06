export type ScheduleConfig =
| { type: 'CRON'; cron: string; timezone?: string }
| { type: 'INTERVAL'; everySeconds: number }
| { type: 'DAILY_AT'; time: string; timezone?: string } // 'HH:mm'
| { type: 'WEEKLY_AT'; weekday: number; time: string; timezone?: string }; // 0-6 (Sun-Sat)


export function toPersistence(config: ScheduleConfig) {
switch (config.type) {
case 'CRON':
return {
scheduleType: 'CRON' as const,
cronExpression: normalizeCron(config.cron),
intervalSeconds: null,
timezone: config.timezone ?? 'America/Sao_Paulo',
};
case 'INTERVAL':
return {
scheduleType: 'INTERVAL' as const,
cronExpression: null,
intervalSeconds: Math.max(1, Math.floor(config.everySeconds)),
timezone: 'America/Sao_Paulo',
};
case 'DAILY_AT': {
const [hh, mm] = config.time.split(':').map((n) => parseInt(n, 10));
const cron = `0 ${mm} ${hh} * * *`;
return {
scheduleType: 'CRON' as const,
cronExpression: cron,
intervalSeconds: null,
timezone: config.timezone ?? 'America/Sao_Paulo',
};
}
case 'WEEKLY_AT': {
const [hh, mm] = config.time.split(':').map((n) => parseInt(n, 10));
const cron = `0 ${mm} ${hh} * * ${config.weekday}`;
return {
scheduleType: 'CRON' as const,
cronExpression: cron,
intervalSeconds: null,
timezone: config.timezone ?? 'America/Sao_Paulo',
};
}
}
}


function normalizeCron(cron: string) {
// Ensure 6-field (sec min hour dom mon dow) for the 'cron' library used by Nest
const parts = cron.trim().split(/\s+/);
if (parts.length === 5) return `0 ${cron}`; // add seconds=0
if (parts.length !== 6) throw new Error(`Invalid cron expression: ${cron}`);
return cron;
}