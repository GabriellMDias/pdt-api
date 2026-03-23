import type { ClearDataRoutineKey } from '@/src/database/repositories';

export type ClearDataRoutineDefinition = {
  key: ClearDataRoutineKey;
  label: string;
  groupLabel: string;
  description: string;
};

export type ClearDataExecutionSummary = {
  routines: readonly ClearDataRoutineKey[];
  deletedEntries: number;
  deletedOutboxEvents: number;
  perRoutine: readonly {
    routine: ClearDataRoutineKey;
    deletedEntries: number;
    deletedOutboxEvents: number;
  }[];
};
