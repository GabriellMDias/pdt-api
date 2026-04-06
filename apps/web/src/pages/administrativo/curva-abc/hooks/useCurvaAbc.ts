import { useCallback } from "react";
import { API_BASE, api, authHeaders } from "../../../../services/api";
import type { CurvaAbcRow, GetCurvaAbcParams } from "../types";

const BASE = `${API_BASE}/api/curva-abc`;

export function useCurvaAbc(token?: string | null) {
  const fetchCurvaAbc = useCallback(
    async (filters: GetCurvaAbcParams) => {
      const qs = new URLSearchParams();

      if (filters?.storeId?.length)
        qs.set("storeId", filters.storeId.join(","));
      if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
      if (filters?.finalDate) qs.set("finalDate", filters.finalDate);
      if (filters?.mercadologicoPair?.length) {
        qs.set(
          "mercadologicoPair",
          filters.mercadologicoPair
            .map((item) => `${item.mercadologico1}:${item.mercadologico2}`)
            .join(","),
        );
      }

      const url = `${BASE}${qs.toString() ? `?${qs.toString()}` : ""}`;
      return api<CurvaAbcRow[]>(url, { headers: authHeaders(token) });
    },
    [token],
  );

  return { fetchCurvaAbc } as const;
}
