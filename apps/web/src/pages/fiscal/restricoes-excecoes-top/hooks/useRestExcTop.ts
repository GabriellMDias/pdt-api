import { useCallback } from "react";
import { api, authHeaders, API_BASE } from "../../../../services/api";
import { useAuth } from "../../../../hooks/useAuth";
import type {
  GetRestricaoTopParams,
  Paginated,
  ProductRow,
  ProductTypeRow,
  RestricaoTop,
  StoreRow,
  SupplierRow,
  TipoRestricao,
  TOP,
  TipMov,
  UpdateRestricaoTopBody,
  UserRow,
} from "../types";

const BASE = `${API_BASE}/api/top`;

export default function useRestExcTop () {
    const { token } = useAuth();

    // Alguns endpoints podem retornar 404/204 quando nao existem dados (ex.: sem restricoes cadastradas).
    // Para estes casos, retornamos null em vez de lancar excecao.
    const apiNullOnNotFound = useCallback(async <T>(url: string, init: RequestInit) => {
      const res = await fetch(url, init);

      if (res.status === 404 || res.status === 204) return null as T;

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || res.statusText || `HTTP ${res.status}`);
      }

      if (!text) return null as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return null as T;
      }
    }, []);

    const fetchTipMov = useCallback(async () => {
        const url = `${BASE}/tipmov`

        return api<TipMov[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchTipoRestricao = useCallback(async () => {
        const url = `${BASE}/tipo-restricao`

        return api<TipoRestricao[]>(url, { headers: authHeaders(token) });
    }, [token])

    const fetchRestricaoTop = useCallback(async (params: GetRestricaoTopParams) => {
        const qs = new URLSearchParams({
          codtipoper: String(params.codtipoper),
          tipmov: String(params.tipmov),
          tiporestricao: String(params.tiporestricao),
        })
        const url = `${BASE}/restricao-top?${qs.toString()}`
        // Trata 404/204 como "sem restricao" para nao exibir toast de erro.
        return apiNullOnNotFound<RestricaoTop | null>(url, { headers: authHeaders(token) });
    }, [token])

    const updateRestricaoTop = useCallback(async (body: UpdateRestricaoTopBody) => {
      const url = `${BASE}/restricao-top`
      return api<RestricaoTop>(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      })
    }, [token])

    const fetchStores = useCallback(async (q: string, page: number, limit: number) => {
      const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) })
      const url = `${BASE}/stores?${qs.toString()}`
      return api<Paginated<StoreRow>>(url, { headers: authHeaders(token) })
    }, [token])

    const fetchSuppliers = useCallback(async (q: string, page: number, limit: number) => {
      const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) })
      const url = `${BASE}/suppliers?${qs.toString()}`
      return api<Paginated<SupplierRow>>(url, { headers: authHeaders(token) })
    }, [token])

    const fetchProducts = useCallback(async (q: string, page: number, limit: number) => {
      const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) })
      const url = `${BASE}/products?${qs.toString()}`
      return api<Paginated<ProductRow>>(url, { headers: authHeaders(token) })
    }, [token])

    const fetchUsers = useCallback(async (q: string, page: number, limit: number) => {
      const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) })
      const url = `${BASE}/users?${qs.toString()}`
      return api<Paginated<UserRow>>(url, { headers: authHeaders(token) })
    }, [token])

    const fetchProductTypes = useCallback(async (q: string, page: number, limit: number) => {
      const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) })
      const url = `${BASE}/product-types?${qs.toString()}`
      return api<Paginated<ProductTypeRow>>(url, { headers: authHeaders(token) })
    }, [token])

    const fetchTops = useCallback(async () => {
        const url = `${BASE}/list`

        return api<TOP[]>(url, { headers: authHeaders(token) });
    }, [token])

    return {
      fetchTipMov,
      fetchTipoRestricao,
      fetchRestricaoTop,
      updateRestricaoTop,
      fetchTops,
      fetchStores,
      fetchSuppliers,
      fetchProducts,
      fetchUsers,
      fetchProductTypes,
    } as const
}