import { api } from '@/src/services/api';
import type {
  MobileSyncCatalogDomain,
  RemoteMobileSyncCatalogResponse,
  RemoteMobileSyncEventEnvelope,
  RemoteMobileSyncPushResponse,
} from '@/src/features/mobile-sync/types';

export async function pushMobileSyncEvents(payload: {
  events: RemoteMobileSyncEventEnvelope[];
}): Promise<RemoteMobileSyncPushResponse> {
  const response = await api.post<RemoteMobileSyncPushResponse>('/mobile-sync/events/push', payload);
  return response.data;
}

export async function pullMobileSyncCatalog(payload: {
  domain: MobileSyncCatalogDomain;
  storeId: number;
}): Promise<RemoteMobileSyncCatalogResponse> {
  const response = await api.post<RemoteMobileSyncCatalogResponse>('/mobile-sync/catalog/pull', payload);
  return response.data;
}
