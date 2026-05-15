import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../../services/api";
import type { Id } from "../../../../../components/crud/GridForm";
import type {
  DailyResultLineConfig,
  DailyResultLinePayload,
  VrMasterDreOption,
} from "../types";

const BASE = `${API_BASE}/api/dre/daily-result-config`;

export function useDailyResultLineConfigCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return api<DailyResultLineConfig[]>(`${BASE}?includeInactive=true`, {
      headers: authHeaders(token),
    });
  }, [token]);

  const createItem = useCallback(async (data: DailyResultLinePayload) => {
    await api<DailyResultLineConfig>(BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: Partial<DailyResultLinePayload>) => {
    await api<DailyResultLineConfig>(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const deleteItem = useCallback(async (id: Id) => {
    await api<DailyResultLineConfig>(`${BASE}/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }, [token]);

  const seedDefault = useCallback(async () => {
    await api(`${BASE}/seed-default`, {
      method: "POST",
      headers: authHeaders(token),
    });
  }, [token]);

  const fetchVrMasterDreOptions = useCallback(async () => {
    return api<VrMasterDreOption[]>(`${BASE}/vrmaster-dre-options`, {
      headers: authHeaders(token),
    });
  }, [token]);

  return { fetchAll, createItem, updateItem, deleteItem, seedDefault, fetchVrMasterDreOptions } as const;
}
