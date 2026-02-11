import { api } from '@/src/services/api';
import type { RemoteSyncPayload } from '@/src/features/auth/types';

export async function fetchUsersSyncPayload(): Promise<RemoteSyncPayload> {
  const response = await api.get<RemoteSyncPayload>('/users/mobile-sync');
  return response.data;
}
