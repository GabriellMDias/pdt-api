import { api, authHeaders } from "../../permissions/services/permissionsApi";
import type { ParameterEffective, ParameterListItem } from "../types/parameters";

export const API = {
  LIST: (storeId?: number) => (storeId ? `/api/parameters?storeId=${storeId}` : "/api/parameters"),
  ONE: (code: string, storeId?: number) => {
    const c = encodeURIComponent(code);
    return storeId ? `/api/parameters/${c}?storeId=${storeId}` : `/api/parameters/${c}`;
  },
  PATCH: (code: string) => `/api/parameters/${encodeURIComponent(code)}`,
};

export async function listParameters(token: string | null | undefined, storeId?: number) {
  return api<ParameterListItem[]>(API.LIST(storeId), { headers: authHeaders(token) });
}

export async function getParameter(token: string | null | undefined, code: string, storeId?: number) {
  return api<ParameterEffective>(API.ONE(code, storeId), { headers: authHeaders(token) });
}

export async function patchParameter(
  token: string | null | undefined,
  code: string,
  value: string,            // <-- string, conforme API
  storeId?: number
) {
  return api<ParameterEffective>(API.PATCH(code), {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(storeId ? { value, storeId } : { value }),
  });
}