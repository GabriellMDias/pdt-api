import { API_BASE, authHeaders, api } from "../../../../services/api";
import type {
  Job,
  JobRun,
  UpdateJobDto,
  GoogleDriveBackupConfig,
  UpsertGoogleDriveBackupConfigDto,
  GoogleDriveOauthUrlRequest,
  GoogleDriveOauthUrlResponse,
  GoogleDriveOauthExchangeRequest,
  GoogleDriveBackupTestResult,
  GoogleDriveFolder,
  GoogleDriveFolderList,
  GoogleDriveBackupFileList,
  GoogleDriveBackupRestoreRequest,
  GoogleDriveBackupRestoreResult,
} from "./types";

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

  getGoogleDriveBackupConfig: (token?: string | null) =>
    api<GoogleDriveBackupConfig>(`${BASE}/backup/google-drive/config`, {
      headers: authHeaders(token),
    }),

  upsertGoogleDriveBackupConfig: (
    payload: UpsertGoogleDriveBackupConfigDto,
    token?: string | null,
  ) =>
    api<GoogleDriveBackupConfig>(`${BASE}/backup/google-drive/config`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  getGoogleDriveOauthUrl: (
    payload: GoogleDriveOauthUrlRequest,
    token?: string | null,
  ) =>
    api<GoogleDriveOauthUrlResponse>(`${BASE}/backup/google-drive/oauth-url`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  exchangeGoogleDriveOauthCode: (
    payload: GoogleDriveOauthExchangeRequest,
    token?: string | null,
  ) =>
    api<GoogleDriveBackupConfig>(`${BASE}/backup/google-drive/oauth-exchange`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  testGoogleDriveBackupConfig: (token?: string | null) =>
    api<GoogleDriveBackupTestResult>(`${BASE}/backup/google-drive/test`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }),

  listGoogleDriveFolders: (
    token?: string | null,
    parentId?: string,
    pageToken?: string,
    pageSize = 100,
  ) => {
    const qs = new URLSearchParams();
    if (parentId) qs.set("parentId", parentId);
    if (pageToken) qs.set("pageToken", pageToken);
    if (pageSize) qs.set("pageSize", String(pageSize));

    return api<GoogleDriveFolderList>(
      `${BASE}/backup/google-drive/folders${qs.toString() ? `?${qs.toString()}` : ""}`,
      { headers: authHeaders(token) },
    );
  },

  getGoogleDriveFolderDetails: (folderId: string, token?: string | null) =>
    api<GoogleDriveFolder>(`${BASE}/backup/google-drive/folders/${encodeURIComponent(folderId)}`, {
      headers: authHeaders(token),
    }),

  listGoogleDriveBackupFiles: (
    token?: string | null,
    pageToken?: string,
    pageSize = 100,
  ) => {
    const qs = new URLSearchParams();
    if (pageToken) qs.set("pageToken", pageToken);
    if (pageSize) qs.set("pageSize", String(pageSize));

    return api<GoogleDriveBackupFileList>(
      `${BASE}/backup/google-drive/backups${qs.toString() ? `?${qs.toString()}` : ""}`,
      { headers: authHeaders(token) },
    );
  },

  restoreGoogleDriveBackup: (
    payload: GoogleDriveBackupRestoreRequest,
    token?: string | null,
  ) =>
    api<GoogleDriveBackupRestoreResult>(`${BASE}/backup/google-drive/restore`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
};
