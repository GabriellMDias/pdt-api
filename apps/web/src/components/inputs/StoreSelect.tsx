import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { fieldControlInteractiveClass } from "./styles";

type Store = {
  id: number;
  description: string;
  storeName: string;
  activeStatus: boolean;
  cnpj: string;
};

type Permission = {
  code: string;
  global: boolean;
  stores: number[];
  useStorePermission: boolean;
};

type Props = {
  /** Código da permissão que rege o acesso às lojas (ex.: "stock-analysis:consultar"). Opcional: se omitido, não restringe por permissão */
  permissionCode?: string;
  /** ID selecionado */
  value?: number | string | null;
  /** Callback de alteração */
  onChange: (id: number | null) => void;
  /** Placeholder do select */
  placeholder?: string;
  /** Filtrar somente lojas ativas */
  onlyActive?: boolean;
  className?: string;
  disabled?: boolean;

  /** ---- URL Sync (opcional) ---- */
  /** Habilita/desabilita sincronização com a URL */
  syncUrl?: boolean;
  /** Nome do parâmetro para escrever (ex.: "storeId") */
  urlParamKey?: string;
  /** Chaves legadas aceitas para leitura inicial (ex.: ["loja"]) */
  legacyUrlKeys?: string[];
  /** Usa replace ao atualizar a URL (true = não polui histórico) */
  replaceHistory?: boolean;
  /** Auto‑seleciona a única loja disponível */
  autoSelectIfSingle?: boolean;
};

const API_BASE = "";

function authHeaders(token?: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function StoreSelect({
  permissionCode,
  value = null,
  onChange,
  placeholder = "Selecione a loja…",
  onlyActive = false,
  className,
  disabled,
  syncUrl = false,
  urlParamKey = "storeId",
  legacyUrlKeys = ["loja"],
  replaceHistory = true,
  autoSelectIfSingle = true,
}: Props) {
  const { token, permissions, userId } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sp, setSearchParams] = useSearchParams();
  const isAdmin = userId === 0 || String(userId) === "0";
  const perms = permissions as Permission[] | undefined;
  const permsReady = permissions !== undefined && permissions !== null;

  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef<string | null>(null);

  // 1) Hidrata seleção a partir da URL (uma vez)
  useEffect(() => {
    if (!syncUrl || didInitFromUrl.current) return;

    const raw =
      sp.get(urlParamKey) ||
      legacyUrlKeys.map((k) => sp.get(k) || "").find(Boolean) ||
      "";
    const id = Number(raw.trim());

    if (id && (value === null || value === undefined || value === "")) {
      const parsed = Number.isNaN(Number(id)) ? id : Number(id);
      onChange(parsed);
    }

    if (raw) {
      const qs = new URLSearchParams(sp);
      qs.set(urlParamKey, id.toString());
      for (const legacy of legacyUrlKeys) qs.delete(legacy);
      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = id.toString();
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, urlParamKey, legacyUrlKeys, onChange]);

  // 2) Carrega lojas
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFetchError(null);
    fetch(`${API_BASE}/api/stores`, {
      signal: ac.signal,
      headers: authHeaders(token),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar lojas");
        return r.json();
      })
      .then((data: Store[]) => setStores(data.filter((s) => s.id !== 0)))
      .catch((e) => {
        if (e.name !== "AbortError") setFetchError(String(e.message || e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [token]);

  // 3) Calcula lojas permitidas
  const allowedIds: number[] | null = useMemo(() => {
    if (isAdmin || !permissionCode) return null; // sem restrição
    if (!permsReady) return null;
    const perm = perms?.find(
      (p) => (p as Permission).code === permissionCode,
    ) as Permission | undefined;
    if (!perm) return [];
    if (!perm.useStorePermission) return null;
    if (perm.global) return null;
    return Array.isArray(perm.stores) ? perm.stores : [];
  }, [perms, permsReady, permissionCode, isAdmin]);

  // 4) Aplica filtros
  const filteredStores = useMemo(() => {
    const base = onlyActive ? stores.filter((s) => s.activeStatus) : stores;
    if (allowedIds === null) return base;
    const set = new Set(allowedIds.map(String));
    return base.filter((s) => set.has(String(s.id)));
  }, [stores, onlyActive, allowedIds]);

  // 5) Normaliza seleção e auto‑seleção
  useEffect(() => {
    if (loading || !permsReady) return;

    const allowedSet = new Set(filteredStores.map((s) => String(s.id)));
    const current =
      value === null || value === undefined || value === ""
        ? null
        : String(value);

    // Se valor atual não é permitido, limpa
    if (current && !allowedSet.has(current)) {
      onChange(null);
      return;
    }

    if (!current && autoSelectIfSingle && filteredStores.length === 1) {
      onChange(filteredStores[0].id);
    }
  }, [
    filteredStores,
    value,
    onChange,
    autoSelectIfSingle,
    loading,
    permsReady,
  ]);

  // 6) Escreve na URL quando seleção muda
  useEffect(() => {
    if (!syncUrl || !didInitFromUrl.current) return;

    const current =
      value === null || value === undefined || value === ""
        ? ""
        : String(value);
    const currentInUrl = sp.get(urlParamKey) || "";

    if (current === currentInUrl) {
      lastUrlValueRef.current = current;
      return;
    }
    if (lastUrlValueRef.current === current) return;

    const qs = new URLSearchParams(sp);
    if (current) qs.set(urlParamKey, current);
    else qs.delete(urlParamKey);
    for (const legacy of legacyUrlKeys) qs.delete(legacy);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sp, syncUrl, urlParamKey, legacyUrlKeys, replaceHistory]);

  const options = useMemo(
    () =>
      filteredStores.map((s) => ({
        value: s.id,
        label: `${s.storeName} (#${s.id})`,
      })),
    [filteredStores],
  );

  const isDisabled =
    disabled || loading || !!fetchError || options.length === 0;
  const selectValue =
    value === null || value === undefined ? "" : String(value);

  return (
    <div className={className}>
      <select
        className={fieldControlInteractiveClass}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        disabled={isDisabled}
      >
        <option value="">
          {loading
            ? "Carregando lojas…"
            : fetchError
              ? "Erro ao carregar lojas"
              : placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {fetchError && (
        <p className="mt-1 text-xs text-red-600">Erro: {fetchError}</p>
      )}
    </div>
  );
}
