import { useCallback, useEffect, useMemo, useState } from "react";
import { API, api, authHeaders } from "../services/permissionsApi";
import type { PermissionCatalogEntry, Store, User, UserPermissionState } from "../types";
import { deepClone, diffPermissions } from "../utils";

// Resposta do backend em /permissions/:userId
type ServerUserPermissionsResponse = {
  userId: number;
  permissions: Array<{
    code: string;
    global: boolean;
    stores: number[];
    useStorePermission: boolean;
  }>;
};

export function usePermissionsData(token?: string | null) {
  // Dados base
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogEntry[]>([]);

  // Seleção e estados de trabalho
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [original, setOriginal] = useState<UserPermissionState>({});
  const [working, setWorking] = useState<UserPermissionState>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changedCodes = useMemo(() => diffPermissions(original, working), [original, working]);

  // Carregamento inicial: users, stores, catalog
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, s, c] = await Promise.all([
          api<User[]>(API.USERS, { headers: authHeaders(token) }),
          api<Store[]>(API.STORES, { headers: authHeaders(token) }),
          api<PermissionCatalogEntry[]>(API.CATALOG, { headers: authHeaders(token) }),
        ]);
        if (cancelled) return;

        // ⚠️ Ignora store id=0 ("Sem loja")
        const filteredStores = (s || []).filter(st => st.id !== 0);

        setUsers(u);
        setStores(filteredStores);
        setCatalog(c);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const normalizeServerToState = useCallback(
    (data: ServerUserPermissionsResponse): UserPermissionState => {
      const byCode = new Map(data.permissions.map(p => [p.code, p]));
      const result: UserPermissionState = {};
      for (const item of catalog) {
        const s = byCode.get(item.code);
        result[item.code] = s
          ? {
              global: Boolean(s.global),
              // ⚠️ filtra storeId=0 caso venha do backend
              stores: Array.isArray(s.stores) ? s.stores.filter(id => id !== 0) : [],
            }
          : { global: false, stores: [] };
      }
      return result;
    },
    [catalog]
  );

  const fetchUserPerms = useCallback(async (uid: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ServerUserPermissionsResponse>(API.USER(uid), { headers: authHeaders(token) });
      const filled = normalizeServerToState(data);
      setOriginal(deepClone(filled));
      setWorking(deepClone(filled));
    } catch (e: any) {
      setError(e?.message || String(e));
      setOriginal({});
      setWorking({});
    } finally {
      setLoading(false);
    }
  }, [token, normalizeServerToState]);

  // Reagir à seleção do usuário
  useEffect(() => {
    if (selectedUserId === null || selectedUserId === undefined) return;
    fetchUserPerms(selectedUserId);
  }, [selectedUserId, fetchUserPerms]);

  // Ações
  const resetChanges = useCallback(() => setWorking(deepClone(original)), [original]);

  const reloadUserPerms = useCallback(() => {
    if (selectedUserId === null || selectedUserId === undefined) return;
    fetchUserPerms(selectedUserId);
  }, [selectedUserId, fetchUserPerms]);

  const save = useCallback(async () => {
    if (selectedUserId === null || selectedUserId === undefined) return;
    setSaving(true);
    setError(null);

    try {
      // Mapa de quais codes são por loja
      const useStoreByCode = new Map<string, boolean>(
        catalog.map(c => [c.code, c.useStorePermission])
      );

      // Buckets de mudanças
      const globalsEnable = new Set<string>();
      const globalsDisable = new Set<string>();
      const perStoreEnable: Record<number, Set<string>> = {};
      const perStoreDisable: Record<number, Set<string>> = {};

      const addTo = (bucket: Record<number, Set<string>>, storeId: number, code: string) => {
        if (!bucket[storeId]) bucket[storeId] = new Set();
        bucket[storeId].add(code);
      };

      for (const code of changedCodes) {
        const isStore = useStoreByCode.get(code) === true;
        const prev = original[code] || { global: false, stores: [] };
        const curr = working[code] || { global: false, stores: [] };

        // Global ON/OFF
        if (prev.global !== curr.global) {
          (curr.global ? globalsEnable : globalsDisable).add(code);
        }

        // Diferenças por loja (somente quando não for global)
        if (isStore && !curr.global) {
          const prevSet = new Set((prev.stores || []).filter(id => id !== 0));
          const currSet = new Set((curr.stores || []).filter(id => id !== 0));

          for (const st of currSet) if (!prevSet.has(st)) addTo(perStoreEnable, st, code);
          for (const st of prevSet) if (!currSet.has(st)) addTo(perStoreDisable, st, code);
        }
      }

      const headers = authHeaders(token);
      const reqs: Promise<any>[] = [];

      // Lotes globais (sem storeId)
      const globalsEnableArr = Array.from(globalsEnable);
      if (globalsEnableArr.length)
        reqs.push(api(API.USER(selectedUserId), {
          method: "PATCH",
          headers,
          body: JSON.stringify({ permissionsCode: globalsEnableArr, enable: true }),
        }));

      const globalsDisableArr = Array.from(globalsDisable);
      if (globalsDisableArr.length)
        reqs.push(api(API.USER(selectedUserId), {
          method: "PATCH",
          headers,
          body: JSON.stringify({ permissionsCode: globalsDisableArr, enable: false }),
        }));

      // Lotes por loja (ignora storeId=0 por segurança)
      for (const [storeIdStr, setCodes] of Object.entries(perStoreEnable)) {
        const storeId = Number(storeIdStr);
        if (storeId === 0) continue;
        const codes = Array.from(setCodes);
        if (codes.length)
          reqs.push(api(API.USER(selectedUserId), {
            method: "PATCH",
            headers,
            body: JSON.stringify({ permissionsCode: codes, enable: true, storeId }),
          }));
      }

      for (const [storeIdStr, setCodes] of Object.entries(perStoreDisable)) {
        const storeId = Number(storeIdStr);
        if (storeId === 0) continue;
        const codes = Array.from(setCodes);
        if (codes.length)
          reqs.push(api(API.USER(selectedUserId), {
            method: "PATCH",
            headers,
            body: JSON.stringify({ permissionsCode: codes, enable: false, storeId }),
          }));
      }

      await Promise.all(reqs);
      await fetchUserPerms(selectedUserId);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [selectedUserId, token, catalog, changedCodes, original, working, fetchUserPerms]);

  const copyFromUser = useCallback(async (fromId: number) => {
    if (fromId === selectedUserId) return;
    try {
      const data = await api<ServerUserPermissionsResponse>(API.USER(fromId), { headers: authHeaders(token) });
      const filled = normalizeServerToState(data);
      setWorking(deepClone(filled));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, [selectedUserId, token, normalizeServerToState]);

  return {
    users, stores, catalog,
    selectedUserId, setSelectedUserId,
    original, working, setWorking,
    loading, saving, error,
    changedCodes,
    resetChanges, reloadUserPerms, save, copyFromUser,
  } as const;
}