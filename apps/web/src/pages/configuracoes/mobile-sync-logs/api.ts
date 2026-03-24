import { API_BASE, api, authHeaders } from "../../../services/api";
import type {
  MobileTransmissionLogFilters,
  MobileTransmissionLogUserOption,
  PaginatedMobileTransmissionLogs,
} from "./types";

const BASE = `${API_BASE}/api/mobile-sync`;

export const mobileSyncLogsApi = {
  list: (
    token: string | null | undefined,
    page: number,
    pageSize: number,
    filters: MobileTransmissionLogFilters,
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));

    if (filters.initialDate) qs.set("initialDate", filters.initialDate);
    if (filters.finalDate) qs.set("finalDate", filters.finalDate);
    if (typeof filters.userId === "number" && filters.userId > 0) {
      qs.set("userId", String(filters.userId));
    }
    if (filters.routineType) qs.set("routineType", filters.routineType);
    if ((filters.storeIds?.length ?? 0) > 0) {
      for (const storeId of filters.storeIds ?? []) {
        qs.append("storeIds", String(storeId));
      }
    }

    return api<PaginatedMobileTransmissionLogs>(
      `${BASE}/logs?${qs.toString()}`,
      { headers: authHeaders(token) },
    );
  },

  listUsers: (token: string | null | undefined) =>
    api<MobileTransmissionLogUserOption[]>(`${BASE}/logs/users`, {
      headers: authHeaders(token),
    }),
};
