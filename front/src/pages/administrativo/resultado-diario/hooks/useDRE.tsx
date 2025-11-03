import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import type { CostCenter, DREByCostCenter, GetDREParams, Store } from "../types";

const BASE = `${API_BASE}/api/dre`;

export function useDRE (token?: string | null) {
    const fetchDREData = useCallback(async (filters: GetDREParams) => {
        const qs = new URLSearchParams();
        if (filters?.storeId) qs.set("storeId", filters.storeId.join(','));
        if (filters?.costCenterId) qs.set("costCenterId", filters?.costCenterId.join(','));
        if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
        if (filters?.finalDate) qs.set("finalDate", filters.finalDate);

        const url = `${BASE}/unified${qs.toString() ? `?${qs.toString()}` : ""}`;

        return api<DREByCostCenter[]>(url, { headers: authHeaders(token) });
      }, [token]);

      const fetchCostCenters = useCallback(async () => {
        return api<CostCenter[]>(`${API_BASE}/api/cost-centers`, { headers: authHeaders(token) })
      }, [token])

      const fetchStores = useCallback(async () => {
        return api<Store[]>(`${API_BASE}/api/stores`, { headers: authHeaders(token) })
      }, [token])

    return { fetchDREData, fetchCostCenters, fetchStores } as const;
}