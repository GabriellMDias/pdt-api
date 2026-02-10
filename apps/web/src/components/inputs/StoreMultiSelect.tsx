import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MultiSelect, { type Option } from "./MultiSelect";
import { useAuth } from "../../hooks/useAuth";

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
  /** Código da permissão que rege o acesso às lojas (ex.: "stock-analysis:consultar") */
  permissionCode: string;
  /** IDs selecionados (números ou strings) */
  value: Array<number | string>;
  /** Callback de alteração */
  onChange: (ids: Array<number | string>) => void;
  /** Placeholder do botão */
  placeholder?: string;
  /** Se true, auto-seleciona a única loja disponível */
  autoSelectIfSingle?: boolean;
  /** Filtrar somente lojas ativas */
  onlyActive?: boolean;
  className?: string;

  /** ---- URL Sync (opcional) ---- */
  /** Habilita/desabilita sincronização com a URL */
  syncUrl?: boolean;
  /** Nome do parâmetro para escrever (ex.: "storeIds") */
  urlParamKey?: string;
  /** Chaves legadas aceitas para leitura inicial (ex.: ["lojas"]) */
  legacyUrlKeys?: string[];
  /** Usa replace ao atualizar a URL (true = não polui histórico) */
  replaceHistory?: boolean;
};

const API_BASE = "";

function authHeaders(token?: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Input reutilizável para seleção de lojas com respeito às permissões por loja.
 * Admin (userId === 0) tem acesso a todas as lojas, independentemente de permissão.
 * Opcionalmente, sincroniza seleção com URL (storeIds por padrão; lê "lojas" como legado).
 */
export default function StoreMultiSelect({
  permissionCode,
  value,
  onChange,
  placeholder = "Selecione as lojas...",
  autoSelectIfSingle = true,
  onlyActive = false,
  className,

  // URL sync (opcional)
  syncUrl = true,
  urlParamKey = "storeIds",
  legacyUrlKeys = ["lojas"],
  replaceHistory = true,
}: Props) {
  const { token, permissions, userId } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sp, setSearchParams] = useSearchParams();
  const isAdmin = userId === 0 || String(userId) === "0";
  const perms = permissions as Permission[] | undefined;
  const permsReady = perms !== undefined && perms !== null;

  // flags/refs para URL sync
  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef<string | null>(null);

  // ===== 1) Hidrata imediatamente a partir da URL (sem depender de lojas/permissões) =====
  useEffect(() => {
    if (!syncUrl) return;
    if (didInitFromUrl.current) return;

    const raw =
      sp.get(urlParamKey) ||
      legacyUrlKeys.map((k) => sp.get(k) || "").find(Boolean) ||
      "";

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length && value.length === 0) {
      onChange(ids); // entrega ao pai já no mount
    }

    // Normaliza a URL para a chave nova (se necessário)
    if (raw) {
      const qs = new URLSearchParams(sp);
      qs.set(urlParamKey, ids.join(","));
      for (const legacy of legacyUrlKeys) qs.delete(legacy);
      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = ids.join(",");
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, urlParamKey, legacyUrlKeys, onChange, value.length]);

  // ===== 2) Carrega lojas =====
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
      .then((data: Store[]) => setStores(data.filter((str) => str.id !== 0)))
      .catch((e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any).name !== "AbortError")
          setFetchError(String((e as any).message || e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [token]);

  // ===== 3) Calcula lojas permitidas conforme permissão (admin ignora restrições) =====
  const allowedIds: number[] | null = useMemo(() => {
    if (isAdmin) return null;
    if (!permsReady) return null; // ainda não sabemos, não restringe
    const perm = perms?.find((p) => p.code === permissionCode);
    if (!perm) return []; // não possui a permissão -> nenhuma loja
    if (!perm.useStorePermission) return null; // sem restrição por loja
    if (perm.global) return null; // acesso global -> todas as lojas
    return Array.isArray(perm.stores) ? perm.stores : [];
  }, [perms, permsReady, permissionCode, isAdmin]);

  // ===== 4) Aplica filtros (status e permissão) =====
  const filteredStores = useMemo(() => {
    const base = onlyActive ? stores.filter((s) => s.activeStatus) : stores;
    if (allowedIds === null) return base; // sem restrição (admin/global/sem-perm)
    const set = new Set(allowedIds.map(String));
    return base.filter((s) => set.has(String(s.id)));
  }, [stores, onlyActive, allowedIds]);

  // ===== 1.1) Reaplica seleção da URL quando dados/perm estiverem prontos =====
  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return; // garante que já lemos a URL uma vez
    if (loading || !permsReady) return; // espera dados e permissões
    if (value.length > 0) return; // já há seleção, não precisa reaplicar

    const raw =
      sp.get(urlParamKey) ||
      legacyUrlKeys.map((k) => sp.get(k) || "").find(Boolean) ||
      "";

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return;

    const allowedSet = new Set(filteredStores.map((s) => String(s.id)));
    const valid = ids.filter((id) => allowedSet.has(String(id)));

    if (valid.length) onChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    permsReady,
    filteredStores,
    sp,
    syncUrl,
    urlParamKey,
    legacyUrlKeys,
    value.length,
  ]);

  // ===== 5) Normaliza seleção após dados prontos (mantém apenas válidos) =====
  useEffect(() => {
    if (loading || !permsReady) return;

    const allowedSet = new Set(filteredStores.map((s) => String(s.id)));
    const valueStr = value.map((v) => String(v));

    // só normaliza se houver inválidos; não zera sem necessidade
    const hasInvalid = valueStr.some((v) => !allowedSet.has(v));
    if (hasInvalid) {
      const normalized = valueStr.filter((v) => allowedSet.has(v));
      if (
        normalized.length !== valueStr.length ||
        normalized.some((id, i) => id !== valueStr[i])
      ) {
        onChange(normalized);
        return; // evita auto-select nesta passada
      }
    }

    // Auto-seleção quando só há 1 loja disponível (e nada selecionado)
    if (
      autoSelectIfSingle &&
      valueStr.length === 0 &&
      filteredStores.length === 1
    ) {
      onChange([String(filteredStores[0].id)]);
    }
  }, [
    filteredStores,
    value,
    onChange,
    autoSelectIfSingle,
    loading,
    permsReady,
  ]);

  // ===== 6) Escreve na URL quando a seleção muda (evita loops) =====
  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return; // espera leitura inicial

    const current = value.map(String).filter(Boolean).join(",");
    const currentInUrl = sp.get(urlParamKey) || "";

    // se já está igual, não mexe
    if (current === currentInUrl) {
      lastUrlValueRef.current = current;
      return;
    }
    // se já escrevemos esse mesmo valor antes, evita ping-pong
    if (lastUrlValueRef.current === current) return;

    const qs = new URLSearchParams(sp);
    if (current) qs.set(urlParamKey, current);
    else qs.delete(urlParamKey);

    // remove legadas
    for (const legacy of legacyUrlKeys) qs.delete(legacy);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sp, syncUrl, urlParamKey, legacyUrlKeys, replaceHistory]);

  // ===== 7) Options para o MultiSelect =====
  const options: Option[] = useMemo(
    () =>
      filteredStores.map((s) => ({
        value: String(s.id), // padroniza como string
        label: `${s.storeName} (#${s.id})`,
      })),
    [filteredStores],
  );

  const disabled = loading || !!fetchError || options.length === 0;

  return (
    <div className={className}>
      <MultiSelect
        options={options}
        value={value.map((v) => String(v))}
        onChange={onChange}
        placeholder={
          loading
            ? "Carregando lojas..."
            : fetchError
              ? "Erro ao carregar lojas"
              : options.length
                ? placeholder
                : "Sem lojas disponíveis"
        }
        className="w-full"
        disabled={disabled}
        searchable
        showSelectAll={options.length > 1}
        clearable
      />
      {fetchError && (
        <p className="mt-1 text-xs text-red-600">Erro: {fetchError}</p>
      )}
    </div>
  );
}
