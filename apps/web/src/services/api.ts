export const API_BASE = ""; // same-origin; ajuste se necessario

type ApiErrorPayload = {
  message?: string | string[];
};

export function authHeaders(token?: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractApiErrorMessage(raw: string, status: number) {
  if (!raw) return `Falha na requisicao (${status}).`;

  try {
    const parsed = JSON.parse(raw) as ApiErrorPayload | string;
    if (typeof parsed === "string") {
      return parsed;
    }
    if (Array.isArray(parsed?.message)) {
      return parsed.message.join("; \n");
    }
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // ignore parse error and fallback to raw text
  }

  return raw;
}

export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(extractApiErrorMessage(raw, res.status));
  }

  if (!raw) return undefined as T;
  return JSON.parse(raw) as T;
}
