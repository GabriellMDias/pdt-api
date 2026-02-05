import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../../services/api";
import type { CostCenterType, UpdateCostCenterTypePayload } from "../types";
import type { Id } from "../../../../../components/crud/GridForm";

export function useCostCenterTypesCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return api<CostCenterType[]>(`${API_BASE}/api/cost-centers/find-all-cost-center-types`, {
      headers: authHeaders(token),
    });
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: UpdateCostCenterTypePayload) => {
    await api(`${API_BASE}/api/cost-centers/update-cost-center-type/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  return { fetchAll, updateItem } as const;
}
