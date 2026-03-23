import type { LocalBalanceHeader } from '@/src/features/balanco/types';

export function parseSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function parsePositiveInt(value: string | string[] | undefined) {
  const parsed = Number(parseSingleParam(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildBalancoScanContextKey(storeId: number, balanceId: number) {
  return `balanco:${storeId}:${balanceId}`;
}

export function isOpenBalanceStatus(statusCode: number | null | undefined) {
  return statusCode === 0;
}

export function formatBalanceStatus(statusCode: number | null | undefined) {
  if (statusCode === 0) {
    return 'Em aberto';
  }

  if (statusCode === 1) {
    return 'Finalizado';
  }

  if (statusCode === 2) {
    return 'Excluido';
  }

  return 'Status nao informado';
}

export function formatBalanceOptionLabel(balance: Pick<LocalBalanceHeader, 'id' | 'description'>) {
  return `${balance.id} - ${balance.description}`;
}

export function formatBalanceOptionDescription(balance: Pick<LocalBalanceHeader, 'stockLabel'>) {
  return `Estoque: ${balance.stockLabel}`;
}

export function formatSignedQuantity(value: number) {
  const fractionDigits = Number.isInteger(value) ? 0 : 3;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 3,
  });
}

export function buildBalanceAggregateKeyPrefix(balanceId: number) {
  return `balance:${balanceId}:`;
}
