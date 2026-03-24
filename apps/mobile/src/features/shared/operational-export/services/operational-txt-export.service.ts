import * as FileSystem from 'expo-file-system/legacy';
import type { LocalBalancoEntry } from '@/src/features/balanco/types';
import {
  listLocalBalancoEntriesByBalance,
} from '@/src/features/balanco/data/balanco-db';
import type { LocalConsumoEntry } from '@/src/features/consumo/types';
import {
  listLocalConsumoEntries,
} from '@/src/features/consumo/data/consumo-db';
import type { LocalProducaoEntry } from '@/src/features/producao/types';
import {
  listLocalProducaoEntries,
} from '@/src/features/producao/data/producao-db';
import type { LocalRuptureEntry } from '@/src/features/rupture/types';
import {
  listLocalRuptureEntries,
} from '@/src/features/rupture/data/rupture-db';
import type { LocalTrocaEntry } from '@/src/features/troca/types';
import {
  listLocalTrocaEntries,
} from '@/src/features/troca/data/troca-db';

const EXPORT_PAGE_SIZE = 500;

type ExportRoutineKey = 'rupture' | 'troca' | 'consumo' | 'producao' | 'balanco';
type ExportSyncStatus =
  | 'pendente'
  | 'enviando'
  | 'transmitido'
  | 'erro_temporario'
  | 'erro_permanente';

type ExportRoutineRequest =
  | {
      routineKey: 'rupture';
      userId: number;
      storeId: number;
    }
  | {
      routineKey: 'troca';
      userId: number;
      storeId: number;
    }
  | {
      routineKey: 'consumo';
      userId: number;
      storeId: number;
    }
  | {
      routineKey: 'producao';
      userId: number;
      storeId: number;
    }
  | {
      routineKey: 'balanco';
      userId: number;
      storeId: number;
      balanceId: number;
    };

export type OperationalTxtExportResult = {
  fileName: string;
  fileUri: string;
  recordCount: number;
};

function buildTimestampSegment(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function buildExportFileName(request: ExportRoutineRequest): string {
  const timestamp = buildTimestampSegment();
  const routineSegment = `pdt-connect-${request.routineKey}`;
  const storeSegment = `loja-${request.storeId}`;

  if (request.routineKey === 'balanco') {
    return `${routineSegment}-${storeSegment}-balanco-${request.balanceId}-${timestamp}.txt`;
  }

  return `${routineSegment}-${storeSegment}-${timestamp}.txt`;
}

async function collectAllPages<T>(
  fetchPage: (payload: { limit: number; offset: number }) => Promise<T[]>,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  while (true) {
    const nextPage = await fetchPage({
      limit: EXPORT_PAGE_SIZE,
      offset,
    });

    if (nextPage.length === 0) {
      break;
    }

    items.push(...nextPage);
    offset += nextPage.length;

    if (nextPage.length < EXPORT_PAGE_SIZE) {
      break;
    }
  }

  return items;
}

async function loadExportRecords(
  request: ExportRoutineRequest,
): Promise<
  | LocalRuptureEntry[]
  | LocalTrocaEntry[]
  | LocalConsumoEntry[]
  | LocalProducaoEntry[]
  | LocalBalancoEntry[]
> {
  switch (request.routineKey) {
    case 'rupture':
      return collectAllPages(({ limit, offset }) =>
        listLocalRuptureEntries({
          userId: request.userId,
          storeId: request.storeId,
          limit,
          offset,
        }),
      );
    case 'troca':
      return collectAllPages(({ limit, offset }) =>
        listLocalTrocaEntries({
          userId: request.userId,
          storeId: request.storeId,
          limit,
          offset,
        }),
      );
    case 'consumo':
      return collectAllPages(({ limit, offset }) =>
        listLocalConsumoEntries({
          userId: request.userId,
          storeId: request.storeId,
          limit,
          offset,
        }),
      );
    case 'producao':
      return collectAllPages(({ limit, offset }) =>
        listLocalProducaoEntries({
          userId: request.userId,
          storeId: request.storeId,
          limit,
          offset,
        }),
      );
    case 'balanco':
      return collectAllPages(({ limit, offset }) =>
        listLocalBalancoEntriesByBalance({
          userId: request.userId,
          storeId: request.storeId,
          balanceId: request.balanceId,
          limit,
          offset,
        }),
      );
    default:
      return [];
  }
}

async function saveTxtToDocuments(payload: {
  fileName: string;
  content: string;
}): Promise<string> {
  const rootDocumentsUri =
    FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Documents');

  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
      rootDocumentsUri,
    );

  if (!permission.granted) {
    throw new Error('Exportacao cancelada. Nenhuma pasta foi autorizada para salvar o TXT.');
  }

  const targetDirectoryUri = permission.directoryUri ?? rootDocumentsUri;
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    targetDirectoryUri,
    payload.fileName,
    'text/plain',
  );

  await FileSystem.writeAsStringAsync(fileUri, payload.content);

  return fileUri;
}

function resolveRoutineLabel(routineKey: ExportRoutineKey): string {
  switch (routineKey) {
    case 'rupture':
      return 'Ruptura';
    case 'troca':
      return 'Troca';
    case 'consumo':
      return 'Consumo';
    case 'producao':
      return 'Producao';
    case 'balanco':
      return 'Balanco';
    default:
      return 'Exportacao';
  }
}

function resolveSyncStatusLabel(status: string): ExportSyncStatus {
  switch (status) {
    case 'sending':
      return 'enviando';
    case 'sent':
      return 'transmitido';
    case 'error_temporary':
      return 'erro_temporario';
    case 'error_permanent':
      return 'erro_permanente';
    default:
      return 'pendente';
  }
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
  ) as T;
}

function buildSyncMetadataRecord(payload: {
  syncStatus: string;
  outboxStatus: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  serverAckStatus: string | null;
  serverReceiptId: string | null;
  serverProcessedAt: string | null;
}) {
  return compactObject({
    statusLocal: resolveSyncStatusLabel(payload.syncStatus),
    outboxStatus: payload.outboxStatus,
    tentativas: payload.attemptCount,
    ultimaTentativaEm: payload.lastAttemptAt ?? undefined,
    ultimoErroCodigo: payload.lastErrorCode ?? undefined,
    ultimoErroMensagem: payload.lastErrorMessage ?? undefined,
    ackServidor: payload.serverAckStatus ?? undefined,
    reciboServidor: payload.serverReceiptId ?? undefined,
    processadoServidorEm: payload.serverProcessedAt ?? undefined,
  });
}

function formatRuptureRecord(entry: LocalRuptureEntry, index: number) {
  return {
    sequencia: index + 1,
    eventoId: entry.eventId,
    criadoEm: entry.createdAt,
    atualizadoEm: entry.updatedAt,
    prateleira: entry.shelfCode,
    produtoId: entry.productId,
    descricaoProduto: entry.productDescription,
    codigoBarras: entry.barcode ?? '',
    sincronizacao: buildSyncMetadataRecord(entry),
  };
}

function formatTrocaRecord(entry: LocalTrocaEntry, index: number) {
  return {
    sequencia: index + 1,
    eventoId: entry.eventId,
    criadoEm: entry.createdAt,
    atualizadoEm: entry.updatedAt,
    motivoId: entry.reasonId,
    motivoDescricao: entry.reasonDescription,
    produtoId: entry.productId,
    descricaoProduto: entry.productDescription,
    codigoBarras: entry.barcode ?? '',
    tipoMovimento: entry.movementType,
    quantidadeInformada: entry.quantityInput,
    embalagem: entry.packageCount,
    quantidadeTotal: entry.totalQuantity,
    quantidadeAssinada: entry.signedQuantity,
    sincronizacao: buildSyncMetadataRecord(entry),
  };
}

function formatConsumoRecord(entry: LocalConsumoEntry, index: number) {
  return {
    sequencia: index + 1,
    eventoId: entry.eventId,
    criadoEm: entry.createdAt,
    atualizadoEm: entry.updatedAt,
    tipoConsumoId: entry.reasonId,
    tipoConsumoDescricao: entry.reasonDescription,
    produtoId: entry.productId,
    descricaoProduto: entry.productDescription,
    codigoBarras: entry.barcode ?? '',
    tipoMovimento: entry.movementType,
    quantidadeInformada: entry.quantityInput,
    embalagem: entry.packageCount,
    quantidadeTotal: entry.totalQuantity,
    quantidadeAssinada: entry.signedQuantity,
    sincronizacao: buildSyncMetadataRecord(entry),
  };
}

function formatProducaoRecord(entry: LocalProducaoEntry, index: number) {
  return {
    sequencia: index + 1,
    eventoId: entry.eventId,
    criadoEm: entry.createdAt,
    atualizadoEm: entry.updatedAt,
    receitaId: entry.recipeId,
    descricaoReceita: entry.recipeDescription,
    produtoId: entry.productId,
    descricaoProduto: entry.productDescription,
    quantidadeProduzida: entry.quantityInput,
    sincronizacao: buildSyncMetadataRecord(entry),
  };
}

function formatBalancoRecord(entry: LocalBalancoEntry, index: number) {
  return {
    sequencia: index + 1,
    eventoId: entry.eventId,
    criadoEm: entry.createdAt,
    atualizadoEm: entry.updatedAt,
    balancoId: entry.balanceId,
    descricaoBalanco: entry.balanceDescription,
    estoque: entry.stockLabel,
    produtoId: entry.productId,
    descricaoProduto: entry.productDescription,
    codigoBarras: entry.barcode ?? '',
    tipoMovimento: entry.movementType,
    quantidadeInformada: entry.quantityInput,
    embalagem: entry.packageCount,
    quantidadeTotal: entry.totalQuantity,
    quantidadeAssinada: entry.signedQuantity,
    sincronizacao: buildSyncMetadataRecord(entry),
  };
}

function buildStatusSummary(records: readonly { syncStatus: string }[]) {
  return records.reduce(
    (summary, record) => {
      const key = resolveSyncStatusLabel(record.syncStatus);
      summary[key] += 1;
      return summary;
    },
    {
      pendente: 0,
      enviando: 0,
      transmitido: 0,
      erro_temporario: 0,
      erro_permanente: 0,
    } satisfies Record<ExportSyncStatus, number>,
  );
}

function formatRecordsForExport(
  request: ExportRoutineRequest,
  records: readonly unknown[],
) {
  switch (request.routineKey) {
    case 'rupture':
      return (records as readonly LocalRuptureEntry[]).map(formatRuptureRecord);
    case 'troca':
      return (records as readonly LocalTrocaEntry[]).map(formatTrocaRecord);
    case 'consumo':
      return (records as readonly LocalConsumoEntry[]).map(formatConsumoRecord);
    case 'producao':
      return (records as readonly LocalProducaoEntry[]).map(formatProducaoRecord);
    case 'balanco':
      return (records as readonly LocalBalancoEntry[]).map(formatBalancoRecord);
    default:
      return [];
  }
}

function buildExportDocument(
  request: ExportRoutineRequest,
  records: readonly unknown[],
) {
  return {
    tipoArquivo: 'pdt-connect-export',
    versaoFormato: 2,
    rotina: resolveRoutineLabel(request.routineKey),
    rotinaChave: request.routineKey,
    exportadoEm: new Date().toISOString(),
    escopo: compactObject({
      lojaId: request.storeId,
      balancoId: request.routineKey === 'balanco' ? request.balanceId : undefined,
    }),
    totalRegistros: records.length,
    resumoStatus: buildStatusSummary(records as readonly { syncStatus: string }[]),
    registros: formatRecordsForExport(request, records),
  };
}

export async function exportOperationalRoutineTxt(
  request: ExportRoutineRequest,
): Promise<OperationalTxtExportResult> {
  const records = await loadExportRecords(request);

  if (records.length === 0) {
    throw new Error('Nao ha dados coletados para exportar nesta rotina.');
  }

  const fileName = buildExportFileName(request);
  const content = JSON.stringify(buildExportDocument(request, records), null, 2);
  const fileUri = await saveTxtToDocuments({
    fileName,
    content,
  });

  return {
    fileName,
    fileUri,
    recordCount: records.length,
  };
}

export function getOperationalRoutineExportLabel(
  routineKey: ExportRoutineKey,
): string {
  return resolveRoutineLabel(routineKey);
}
