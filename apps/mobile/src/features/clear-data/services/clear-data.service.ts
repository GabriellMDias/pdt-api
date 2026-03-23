import {
  clearOperationalDataByScope,
  type ClearDataRoutineKey,
} from '@/src/database/repositories';
import type { ClearDataExecutionSummary } from '@/src/features/clear-data/types';

export async function clearSelectedOperationalData(payload: {
  userId: number;
  storeId: number;
  routines: readonly ClearDataRoutineKey[];
}): Promise<ClearDataExecutionSummary> {
  const uniqueRoutines = [...new Set(payload.routines)];

  if (uniqueRoutines.length === 0) {
    return {
      routines: [],
      deletedEntries: 0,
      deletedOutboxEvents: 0,
      perRoutine: [],
    };
  }

  const perRoutine = await clearOperationalDataByScope({
    userId: payload.userId,
    storeId: payload.storeId,
    routines: uniqueRoutines,
  });

  return {
    routines: uniqueRoutines,
    deletedEntries: perRoutine.reduce((total, item) => total + item.deletedEntries, 0),
    deletedOutboxEvents: perRoutine.reduce(
      (total, item) => total + item.deletedOutboxEvents,
      0,
    ),
    perRoutine,
  };
}
