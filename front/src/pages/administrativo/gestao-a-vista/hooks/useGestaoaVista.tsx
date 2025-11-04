import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import type { CostCenterComparative, GetCostCenterComparativeParams } from "../types";
import type { CostCenter } from "../../resultado-diario/types";

const BASE = `${API_BASE}/api/cost-center-comparative`;

export function useGestaoaVista (token?: string | null) {
    const fetchDREData = useCallback(async (filters: GetCostCenterComparativeParams) => {
        const qs = new URLSearchParams();
        if (filters?.storeId) qs.set("storeId", filters.storeId.join(','));
        if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
        if (filters?.finalDate) qs.set("finalDate", filters.finalDate);
        if (filters?.mode) qs.set("mode", filters.mode);

        const url = `${BASE}${qs.toString() ? `?${qs.toString()}` : ""}`;

        return api<CostCenterComparative[]>(url, { headers: authHeaders(token) });
      }, [token]);

      const fetchCostCenters = useCallback(async () => {
              return api<CostCenter[]>(`${API_BASE}/api/cost-centers`, { headers: authHeaders(token) })
            }, [token])

    return { fetchDREData, fetchCostCenters } as const;
}