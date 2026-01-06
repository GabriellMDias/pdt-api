import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import { useAuth } from "../../../../hooks/useAuth";
import type { RestricaoTop, TipMov, TipoRestricao, TOP } from "../types";

const BASE = `${API_BASE}/api/top`;

export default function useRestExcTop () {
    const { token } = useAuth();

    const fetchTipMov = useCallback(async () => {
        const url = `${BASE}/tipmov`

        return api<TipMov[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchTipoRestricao = useCallback(async () => {
        const url = `${BASE}/tipo-restricao`

        return api<TipoRestricao[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchRestricaoTop = useCallback(async () => {
        const url = `${BASE}/restricao-top`

        return api<RestricaoTop[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchTops = useCallback(async () => {
        const url = `${BASE}/list`

        return api<TOP[]>(url, { headers: authHeaders(token) });
    }, [token])

    return { fetchTipMov, fetchTipoRestricao, fetchRestricaoTop, fetchTops } as const
}