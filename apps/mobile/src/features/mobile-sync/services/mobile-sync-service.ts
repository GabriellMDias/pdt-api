import { AxiosError } from 'axios';
import * as Crypto from 'expo-crypto';
import {
  claimSyncOutboxBatch,
  finishSyncRun,
  getAppMeta,
  insertSyncRun,
  markSyncOutboxEventFailure,
  markSyncOutboxEventSuccess,
  setAppMeta,
} from '@/src/database/repositories';
import type { SyncOutboxEventRow } from '@/src/database/types';
import { pushMobileSyncEvents } from '@/src/features/mobile-sync/api/mobile-sync-api';
import type { RemoteMobileSyncEventEnvelope, SyncDispatchResult } from '@/src/features/mobile-sync/types';

const SYNC_DEVICE_ID_META_KEY = 'sync.device_id';

type TransportFailureClassification = {
  failureClass: 'temporary' | 'permanent';
  httpStatus: number | null;
  errorCode: string;
  errorMessage: string;
};

export async function ensureSyncDeviceId(): Promise<string> {
  const existing = await getAppMeta(SYNC_DEVICE_ID_META_KEY);
  const currentValue = existing?.value?.trim();

  if (currentValue) {
    return currentValue;
  }

  const nextValue = Crypto.randomUUID();
  await setAppMeta(SYNC_DEVICE_ID_META_KEY, nextValue, new Date().toISOString());
  return nextValue;
}

export async function buildSyncPayloadHash(value: unknown): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify(value),
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
    .join(',')}}`;
}

function mapOutboxEventToEnvelope(event: SyncOutboxEventRow): RemoteMobileSyncEventEnvelope {
  const payload = JSON.parse(event.payload_json) as Record<string, unknown>;

  return {
    eventId: event.event_id,
    eventType: event.event_type,
    aggregateType: event.aggregate_type,
    aggregateKey: event.aggregate_key,
    storeId: event.store_id,
    deviceId: event.device_id,
    schemaVersion: event.schema_version,
    payload,
  };
}

function computeNextAttemptAt(attemptCount: number): string {
  const scheduleInSeconds = [5, 15, 30, 60, 120, 300, 900, 1800, 3600];
  const scheduleIndex = Math.max(0, Math.min(attemptCount - 1, scheduleInSeconds.length - 1));
  const baseSeconds = scheduleInSeconds[scheduleIndex] ?? scheduleInSeconds[scheduleInSeconds.length - 1];
  const jitterSeconds = Math.floor(Math.random() * 4);

  return new Date(Date.now() + (baseSeconds + jitterSeconds) * 1000).toISOString();
}

function classifyTransportFailure(error: unknown): TransportFailureClassification {
  if (error instanceof AxiosError) {
    const httpStatus = error.response?.status ?? null;
    const responseMessage =
      typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : null;

    if (httpStatus && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429) {
      return {
        failureClass: 'permanent',
        httpStatus,
        errorCode: 'push_request_rejected',
        errorMessage: responseMessage ?? 'A API rejeitou o lote de sincronizacao.',
      };
    }

    if (!httpStatus) {
      return {
        failureClass: 'temporary',
        httpStatus: null,
        errorCode: 'network_unreachable',
        errorMessage: 'Sem resposta da API. Verifique a internet e tente novamente.',
      };
    }

    return {
      failureClass: 'temporary',
      httpStatus,
      errorCode: 'push_request_failed',
      errorMessage: responseMessage ?? 'A API nao conseguiu processar o lote neste momento.',
    };
  }

  return {
    failureClass: 'temporary',
    httpStatus: null,
    errorCode: 'push_unknown_error',
    errorMessage: error instanceof Error ? error.message : 'Falha ao sincronizar eventos pendentes.',
  };
}

function resolveRunStatus(summary: Pick<SyncDispatchResult, 'processed' | 'duplicates' | 'temporaryErrors' | 'permanentErrors'>): 'success' | 'partial' | 'failed' {
  if (summary.temporaryErrors === 0 && summary.permanentErrors === 0) {
    return 'success';
  }

  if (summary.processed > 0 || summary.duplicates > 0) {
    return 'partial';
  }

  return 'failed';
}

export async function flushPendingSyncOutbox(payload: {
  userId: number;
  storeId?: number | null;
  eventTypePrefix?: string | null;
  aggregateKeyPrefix?: string | null;
  scope: string;
  triggerSource: string;
  batchLimit?: number;
}): Promise<SyncDispatchResult> {
  const startedAt = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();

  const runId = await insertSyncRun({
    runType: 'push',
    scope: payload.scope,
    storeId: payload.storeId ?? null,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
    requestPayloadJson: JSON.stringify({
        storeId: payload.storeId ?? null,
        eventTypePrefix: payload.eventTypePrefix ?? null,
        aggregateKeyPrefix: payload.aggregateKeyPrefix ?? null,
        batchLimit: payload.batchLimit ?? 25,
      }),
  });

  let totalBatchCount = 0;
  let totalEventCount = 0;
  let totalProcessed = 0;
  let totalDuplicates = 0;
  let totalTemporaryErrors = 0;
  let totalPermanentErrors = 0;

  try {
    while (true) {
      const claimedEvents = await claimSyncOutboxBatch({
        userId: payload.userId,
        storeId: payload.storeId ?? null,
        eventTypePrefix: payload.eventTypePrefix ?? null,
        aggregateKeyPrefix: payload.aggregateKeyPrefix ?? null,
        limit: payload.batchLimit ?? 25,
        batchId: Crypto.randomUUID(),
        lockedBy: deviceId,
        claimedAt: new Date().toISOString(),
      });

      if (claimedEvents.length === 0) {
        break;
      }

      totalBatchCount += 1;
      totalEventCount += claimedEvents.length;

      try {
        const response = await pushMobileSyncEvents({
          events: claimedEvents.map(mapOutboxEventToEnvelope),
        });

        const ackByEventId = new Map(response.acknowledgements.map((ack) => [ack.eventId, ack]));

        totalProcessed += response.summary.processed;
        totalDuplicates += response.summary.duplicates;
        totalTemporaryErrors += response.summary.temporaryErrors;
        totalPermanentErrors += response.summary.permanentErrors;

        for (const event of claimedEvents) {
          const acknowledgement = ackByEventId.get(event.event_id);
          const updatedAt = new Date().toISOString();

          if (!acknowledgement) {
            totalTemporaryErrors += 1;
            await markSyncOutboxEventFailure({
              eventId: event.event_id,
              failureClass: 'temporary',
              httpStatus: 200,
              errorCode: 'ack_missing',
              errorMessage: 'A API nao retornou ACK para o evento.',
              nextAttemptAt: computeNextAttemptAt(event.attempt_count),
              updatedAt,
            });
            continue;
          }

          if (acknowledgement.status === 'processed' || acknowledgement.status === 'duplicate') {
            await markSyncOutboxEventSuccess({
              eventId: event.event_id,
              ackStatus: acknowledgement.status,
              receiptId: acknowledgement.receiptId,
              processedAt: acknowledgement.processedAt,
              httpStatus: 200,
              updatedAt,
            });
            continue;
          }

          await markSyncOutboxEventFailure({
            eventId: event.event_id,
            failureClass: acknowledgement.status === 'temporary_error' ? 'temporary' : 'permanent',
            httpStatus: 200,
            errorCode: acknowledgement.errorCode,
            errorMessage: acknowledgement.errorMessage,
            serverAckStatus: acknowledgement.status,
            nextAttemptAt:
              acknowledgement.status === 'temporary_error'
                ? computeNextAttemptAt(event.attempt_count)
                : null,
            updatedAt,
          });
        }
      } catch (error) {
        const classifiedFailure = classifyTransportFailure(error);
        const updatedAt = new Date().toISOString();

        totalEventCount += 0;
        if (classifiedFailure.failureClass === 'temporary') {
          totalTemporaryErrors += claimedEvents.length;
        } else {
          totalPermanentErrors += claimedEvents.length;
        }

        for (const event of claimedEvents) {
          await markSyncOutboxEventFailure({
            eventId: event.event_id,
            failureClass: classifiedFailure.failureClass,
            httpStatus: classifiedFailure.httpStatus,
            errorCode: classifiedFailure.errorCode,
            errorMessage: classifiedFailure.errorMessage,
            nextAttemptAt:
              classifiedFailure.failureClass === 'temporary'
                ? computeNextAttemptAt(event.attempt_count)
                : null,
            updatedAt,
          });
        }

        throw new Error(classifiedFailure.errorMessage);
      }
    }

    await finishSyncRun(runId, {
      status: resolveRunStatus({
        processed: totalProcessed,
        duplicates: totalDuplicates,
        temporaryErrors: totalTemporaryErrors,
        permanentErrors: totalPermanentErrors,
      }),
      finishedAt: new Date().toISOString(),
      responsePayloadJson: JSON.stringify({
        batchCount: totalBatchCount,
        eventCount: totalEventCount,
        processed: totalProcessed,
        duplicates: totalDuplicates,
        temporaryErrors: totalTemporaryErrors,
        permanentErrors: totalPermanentErrors,
      }),
    });

    return {
      batchCount: totalBatchCount,
      eventCount: totalEventCount,
      processed: totalProcessed,
      duplicates: totalDuplicates,
      temporaryErrors: totalTemporaryErrors,
      permanentErrors: totalPermanentErrors,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const errorMessage =
      error instanceof Error ? error.message : 'Falha ao sincronizar eventos pendentes.';

    await finishSyncRun(runId, {
      status:
        totalProcessed > 0 || totalDuplicates > 0 || totalTemporaryErrors > 0 || totalPermanentErrors > 0
          ? 'partial'
          : 'failed',
      finishedAt,
      errorCode: 'push_batch_failed',
      errorMessage,
      responsePayloadJson: JSON.stringify({
        batchCount: totalBatchCount,
        eventCount: totalEventCount,
        processed: totalProcessed,
        duplicates: totalDuplicates,
        temporaryErrors: totalTemporaryErrors,
        permanentErrors: totalPermanentErrors,
      }),
    });

    throw error;
  }
}
