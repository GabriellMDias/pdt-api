import { api } from '@/src/services/api';
import type {
  RemoteMasterStore,
  RemoteUserPermissionsPayload,
} from '@/src/features/bootstrap/types';

export async function fetchStoresCatalog(): Promise<RemoteMasterStore[]> {
  const response = await api.get<RemoteMasterStore[]>('/stores');
  return response.data;
}

export async function fetchUserPermissionScopes(
  userId: number,
): Promise<RemoteUserPermissionsPayload> {
  const response = await api.get<RemoteUserPermissionsPayload>(`/permissions/${userId}`);
  return response.data;
}
