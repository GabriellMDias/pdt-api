import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../../services/api";
import type { Id } from "../../../../../components/crud/GridForm";
import type { Store, UpdateStorePayload } from "../types";

export function useStoresCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return api<Store[]>(`${API_BASE}/api/stores`, {
      headers: authHeaders(token),
    });
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: UpdateStorePayload) => {
    await api(`${API_BASE}/api/stores/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const syncFromVr = useCallback(async () => {
    await api(`${API_BASE}/api/stores/get-stores-vr`, {
      method: "POST",
      headers: authHeaders(token),
    });
  }, [token]);

  return { fetchAll, updateItem, syncFromVr } as const;
}
