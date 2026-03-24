export type DevSeedRoutineKey =
  | 'rupture'
  | 'troca'
  | 'consumo'
  | 'producao'
  | 'balanco';

export type DevSeedVolume = 10 | 100 | 500 | 2000;

export type DevSeedVolumeOption = {
  value: DevSeedVolume;
  label: string;
};

export type DevSeedRoutineResult = {
  routineKey: DevSeedRoutineKey;
  insertedEntries: number;
};

export type DevSeedCleanupResult = {
  routineKey: DevSeedRoutineKey;
  deletedEntries: number;
  deletedOutboxEvents: number;
};

export type DevPerformanceRoutineCounts = {
  routineKey: DevSeedRoutineKey;
  total: number;
  pending: number;
  sent: number;
  sending: number;
  temporaryErrors: number;
  permanentErrors: number;
};

export type DevPerformanceTransmitResult = {
  routineKey: DevSeedRoutineKey;
  durationMs: number;
  batchCount: number;
  eventCount: number;
  processed: number;
  duplicates: number;
  temporaryErrors: number;
  permanentErrors: number;
};

export type DevSeedBatchSummary<T> = {
  results: T[];
  errors: {
    routineKey: DevSeedRoutineKey;
    message: string;
  }[];
};
