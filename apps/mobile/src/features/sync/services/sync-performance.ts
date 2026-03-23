export type SyncTimingMetric = {
  phase: string;
  durationMs: number;
  itemsCount?: number;
  note?: string;
};

export async function measureSyncPhase<T>(
  phase: string,
  action: () => Promise<T> | T,
): Promise<{ result: T; metric: SyncTimingMetric }> {
  const startedAtMs = Date.now();
  const result = await action();

  return {
    result,
    metric: {
      phase,
      durationMs: Date.now() - startedAtMs,
    },
  };
}

export function enrichSyncMetric(
  metric: SyncTimingMetric,
  payload: Partial<Pick<SyncTimingMetric, 'itemsCount' | 'note'>>,
): SyncTimingMetric {
  return {
    ...metric,
    ...payload,
  };
}

export function emitSyncMetricsLog(scope: string, payload: {
  storeId?: number | null;
  itemsCount?: number;
  totalDurationMs: number;
  metrics: SyncTimingMetric[];
}) {
  console.info(
    `[mobile-sync:perf] ${scope} ${JSON.stringify({
      storeId: payload.storeId ?? null,
      itemsCount: payload.itemsCount ?? null,
      totalDurationMs: payload.totalDurationMs,
      metrics: payload.metrics,
    })}`,
  );
}
