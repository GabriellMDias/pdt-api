import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import { useAuth } from "../../../../hooks/useAuth";
import type { AnalysisType, GetConcContabParams } from "../types";

const BASE = `${API_BASE}/api/analysis`;
const GROUP_NAME = 'Conciliação Contábil'

export function useConcContab() {
    const { token } = useAuth();

    const fetchConcContabAnalysesTypes = useCallback(async () => {
        const qs = new URLSearchParams();

        qs.set("groupName", GROUP_NAME)
        qs.set("active", "true")

        const url = `${BASE}/types${qs.toString() ? `?${qs.toString()}` : ""}`;

        return api<AnalysisType[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchConcContab = useCallback(async (filters: GetConcContabParams) => {
        const qs = new URLSearchParams();

        if (filters?.date) qs.set("date", filters.date)
        if (filters?.storeIds) qs.set("storeIds", filters.storeIds.join(','))
        if (filters?.consulta) qs.set("analysisCode", filters.consulta)
        if (filters?.compareMode === "divergente") {
            qs.set("divergente", "true")
        }

        const url = `${BASE}/accountingReconc${qs.toString() ? `?${qs.toString()}` : ""}`;

        return api(url, { headers: authHeaders(token) })
    }, [token])

    return { fetchConcContabAnalysesTypes, fetchConcContab } as const
}