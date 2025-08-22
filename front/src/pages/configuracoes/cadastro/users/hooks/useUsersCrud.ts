// src/pages/configuracoes/cadastro/users/hooks/useUsersCrud.ts
import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../api";
import type { ApiUserPayload, User } from "../types";
import type { Id } from "../../../../../components/crud/GridForm";

export function useUsersCrud(token?: string | null) {
  const fetchAll = useCallback(async () => {
    return api<User[]>(`${API_BASE}/api/users`, { headers: authHeaders(token) });
  }, [token]);

  const createItem = useCallback(async (data: ApiUserPayload) => {
    await api(`${API_BASE}/api/users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: ApiUserPayload) => {
    await api(`${API_BASE}/api/users/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const deleteItem = useCallback(async (id: Id) => {
    await api(`${API_BASE}/api/users/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }, [token]);

  return { fetchAll, createItem, updateItem, deleteItem } as const;
}
