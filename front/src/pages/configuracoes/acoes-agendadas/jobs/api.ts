import { API_BASE, authHeaders, api } from "../../../../services/api";
import type { Job, JobRun, UpdateJobDto } from "./types";

const BASE = `${API_BASE}/api/code-jobs`;

type RunFilters = {
  initialDate?: string; // "YYYY-MM-DD"
  finalDate?: string;   // "YYYY-MM-DD"
  status?: "SUCCESS" | "FAILED" | "RUNNING" | "SKIPPED" | "ALL";
};

export const jobsApi = {
  list: (token?: string | null) =>
    api<Job[]>(`${BASE}`, { headers: authHeaders(token) }),

  get: (id: number, token?: string | null) =>
    api<Job>(`${BASE}/${id}`, { headers: authHeaders(token) }),

  update: (id: number, payload: UpdateJobDto, token?: string | null) =>
    api(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  runNow: (id: number, token?: string | null) =>
    api<{ accepted: true }>(`${BASE}/${id}/run-now`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ reason: "manual" }),
    }),

  runs: (
    id: number,
    token?: string | null,
    page?: number,
    pageSize?: number,
    filters?: RunFilters
  ) => {
    const qs = new URLSearchParams();
    if (page && pageSize) {
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
    }
    if (filters?.initialDate) qs.set("initialDate", filters.initialDate);
    if (filters?.finalDate) qs.set("finalDate", filters.finalDate);
    if (filters?.status && filters.status !== "ALL") qs.set("status", filters.status);

    const url = `${BASE}/${id}/runs${qs.toString() ? `?${qs.toString()}` : ""}`;

    return api<
      JobRun[] |
      { items: JobRun[]; total: number; page: number; pageSize: number; totalPages: number }
    >(url, { headers: authHeaders(token) });
  },
};