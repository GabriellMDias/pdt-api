import { saveAs } from "file-saver";
import { API_BASE, authHeaders, api } from "../../../services/api";

export type MobileRelease = {
  id: number;
  platform: "android";
  versionName: string;
  buildNumber: number;
  changelog: string | null;
  isPublished: boolean;
  isLatest: boolean;
  isRequired: boolean;
  publishedAt: string | null;
  createdAt: string;
  originalFilename: string;
  downloadFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  downloadUrl: string;
  latestDownloadUrl: string;
  createdByUserId: number | null;
  createdByUserName: string | null;
};

export type CreateMobileReleasePayload = {
  file: File;
  versionName: string;
  buildNumber: number;
  changelog: string;
  required: boolean;
  publishNow: boolean;
};

export type UpdateMobileReleasePayload = {
  changelog?: string;
  isPublished?: boolean;
  isLatest?: boolean;
  isRequired?: boolean;
};

const BASE = `${API_BASE}/api/mobile-updates/android`;

export const mobileReleasesApi = {
  list: (token?: string | null) =>
    api<MobileRelease[]>(`${BASE}/releases`, {
      headers: authHeaders(token),
    }),

  upload: async (payload: CreateMobileReleasePayload, token?: string | null) => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("versionName", payload.versionName);
    formData.append("buildNumber", String(payload.buildNumber));
    formData.append("changelog", payload.changelog);
    formData.append("required", String(payload.required));
    formData.append("publishNow", String(payload.publishNow));

    const response = await fetch(`${BASE}/releases`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(raw || "Nao foi possivel enviar a APK.");
    }

    return raw ? (JSON.parse(raw) as MobileRelease) : null;
  },

  update: (id: number, payload: UpdateMobileReleasePayload, token?: string | null) =>
    api<MobileRelease>(`${BASE}/releases/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  downloadRelease: async (release: MobileRelease, token?: string | null) => {
    const response = await fetch(`${BASE}/releases/${release.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || "Nao foi possivel baixar a APK selecionada.");
    }

    const blob = await response.blob();
    saveAs(blob, release.downloadFilename);
  },
};
