import { useCallback } from "react";
import type { UpdatePratBody, UpdatePratResp } from "../types";
import { api, authHeaders, API_BASE } from "../../../../../services/api";

const BASE = `${API_BASE}/api/ruptura/atualizar-prateleira`;

export function useAtualPrat(token?: string | null) {
  const updatePrat = useCallback(
    async (body: UpdatePratBody) => {
      const url = `${BASE}`;

      return api<UpdatePratResp>(url, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body)
      });
    },
    [token],
  );

  return { updatePrat } as const;
}
