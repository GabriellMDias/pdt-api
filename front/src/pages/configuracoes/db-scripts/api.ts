// src/pages/configuracoes/db-scripts/api.ts
import { API_BASE, authHeaders, api } from "../cadastro/users/api";
import type { CreateDbScriptDto, DbScript, DbScriptRun, UpdateDbScriptDto } from "./types";

const BASE = `${API_BASE}/api/db-scripts`;

export const dbScriptsApi = {
  list: (token?: string | null) =>
    api<DbScript[]>(`${BASE}`, { headers: authHeaders(token) }),

  get: (id: number, token?: string | null) =>
    api<DbScript>(`${BASE}/${id}`, { headers: authHeaders(token) }),

  create: (payload: CreateDbScriptDto, token?: string | null) =>
    api(`${BASE}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: UpdateDbScriptDto, token?: string | null) =>
    api(`${BASE}/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  remove: (id: number, token?: string | null) =>
    api<{ ok: true }>(`${BASE}/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  runNow: (id: number, token?: string | null) =>
    api<{ accepted: true }>(`${BASE}/${id}/run-now`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ reason: "manual" }),
    }),

  runs: (id: number, token?: string | null, page?: number, pageSize?: number) => {
    const qs =
      page && pageSize ? `?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}` : "";
    return api<DbScriptRun[] | { items: DbScriptRun[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `${BASE}/${id}/runs${qs}`,
      { headers: authHeaders(token) }
    );
  },
};
