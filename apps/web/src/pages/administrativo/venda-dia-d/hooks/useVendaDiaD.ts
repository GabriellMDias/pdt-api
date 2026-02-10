import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import type { GetVendaDiaDParams, VendaDiaDRow } from "../types";

const BASE = `${API_BASE}/api/venda-dia-d`;

export function useVendaDiaD(token?: string | null) {
  const fetchVendaDiaD = useCallback(
    async (filters: GetVendaDiaDParams) => {
      const qs = new URLSearchParams();

      if (filters?.storeId?.length) qs.set("storeId", filters.storeId.join(","));
      if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
      if (filters?.finalDate) qs.set("finalDate", filters.finalDate);
      if (filters?.viewType) qs.set("viewType", filters.viewType);

      const url = `${BASE}${qs.toString() ? `?${qs.toString()}` : ""}`;
      return api<VendaDiaDRow[]>(url, { headers: authHeaders(token) });
    },
    [token],
  );

  return { fetchVendaDiaD } as const;
}
