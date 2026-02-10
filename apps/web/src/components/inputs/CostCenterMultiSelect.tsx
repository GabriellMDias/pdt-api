import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MultiSelect, { type Option } from './MultiSelect';
import { useAuth } from '../../hooks/useAuth';

type CostCenter = {
  id: number;
  description: string;
  activeStatus: boolean;
};

type Props = {
  /** IDs selecionados (números ou strings) */
  value: Array<number | string>;
  /** Callback de alteração */
  onChange: (ids: Array<number | string>) => void;
  /** Placeholder do botão */
  placeholder?: string;
  /** Se true, auto-seleciona a única centro custo disponível */
  autoSelectIfSingle?: boolean;

  /** Select all on load */
  autoSelectAll?: boolean

  /** Filtrar somente centro custo ativos */
  onlyActive?: boolean;
  className?: string;

  /** ---- URL Sync (opcional) ---- */
  /** Habilita/desabilita sincronização com a URL */
  syncUrl?: boolean;
  /** Nome do parâmetro para escrever (ex.: "storeIds") */
  urlParamKey?: string;
  /** Chaves legadas aceitas para leitura inicial (ex.: ["centrocusto"]) */
  legacyUrlKeys?: string[];
  /** Usa replace ao atualizar a URL (true = não polui histórico) */
  replaceHistory?: boolean;
};

const API_BASE = '';

function authHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Input reutilizável para seleção de centro custo.
 * Opcionalmente, sincroniza seleção com URL (costCenterIds por padrão; lê "centrocustos" como legado).
 */
export default function ConstCenterMultiSelect({
  value,
  onChange,
  placeholder = 'Selecione os centro custos...',
  autoSelectIfSingle = true,
  autoSelectAll = false,
  onlyActive = false,
  className,

  // URL sync (opcional)
  syncUrl = true,
  urlParamKey = 'costCenterIds',
  legacyUrlKeys = ['centrocustos'],
  replaceHistory = true,
}: Props) {
  const { token } = useAuth();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sp, setSearchParams] = useSearchParams();

  // flags/refs para URL sync
  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef<string | null>(null);

  // ===== 1) Hidrata imediatamente a partir da URL =====
  useEffect(() => {
    if (!syncUrl) return;
    if (didInitFromUrl.current) return;

    const raw =
      sp.get(urlParamKey) ||
      legacyUrlKeys.map((k) => sp.get(k) || '').find(Boolean) ||
      '';

    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length && value.length === 0) {
      onChange(ids); // entrega ao pai já no mount
    }

    // Normaliza a URL para a chave nova (se necessário)
    if (raw) {
      const qs = new URLSearchParams(sp);
      qs.set(urlParamKey, ids.join(','));
      for (const legacy of legacyUrlKeys) qs.delete(legacy);
      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = ids.join(',');
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, urlParamKey, legacyUrlKeys, onChange, value.length]);

  // ===== 2) Carrega centro custos =====
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFetchError(null);
    fetch(`${API_BASE}/api/cost-centers`, { signal: ac.signal, headers: authHeaders(token) })
      .then(async (r) => {
        if (!r.ok) throw new Error('Falha ao carregar centro custos');
        return r.json();
      })
      .then((data: CostCenter[]) => setCostCenters(data.filter((str) => str.id !== 0)))
      .catch((e) => {
        if (e.name !== 'AbortError') setFetchError(String(e.message || e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [token]);

  // ===== 4) Aplica filtros (status e permissão) =====
  const filteredCostCenters = useMemo(() => {
    const base = onlyActive ? costCenters.filter((s) => s.activeStatus) : costCenters;
    return base;
  }, [costCenters, onlyActive]);

  // ===== 5) Normaliza seleção após dados prontos (mantém apenas válidos) =====
  useEffect(() => {
    if (loading) return;

    const allowedSet = new Set(filteredCostCenters.map((s) => String(s.id)));
    const normalized = value
      .filter((v) => allowedSet.has(String(v)))
      .map((v) => String(v));

    const valueStr = value.map((v) => String(v));
    const changed =
      normalized.length !== valueStr.length ||
      normalized.some((id, i) => id !== valueStr[i]);

    if (changed) {
      onChange(normalized);
      return; // evita auto-select nesta passada
    }

    // Auto-seleção quando só há 1 loja disponível (e nada selecionado)
    if (autoSelectIfSingle && normalized.length === 0 && filteredCostCenters.length === 1) {
      onChange([String(filteredCostCenters[0].id)]);
    }

    if(autoSelectAll && normalized.length === 0) {
      onChange(filteredCostCenters.map((costCenter) => String(costCenter.id)))
    }
  }, [filteredCostCenters, value, onChange, autoSelectIfSingle, autoSelectAll, loading]);

  // ===== 6) Escreve na URL quando a seleção muda (evita loops) =====
  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return; // espera leitura inicial

    const current = value.map(String).filter(Boolean).join(',');
    const currentInUrl = sp.get(urlParamKey) || '';

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
      filteredCostCenters.map((s) => ({
        value: String(s.id), // padroniza como string
        label: `${s.description || s.description} (#${s.id})`,
      })),
    [filteredCostCenters]
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
            ? 'Carregando centro custos...'
            : fetchError
            ? 'Erro ao carregar centro custos'
            : options.length
            ? placeholder
            : 'Sem centro custos disponíveis'
        }
        className="w-full"
        disabled={disabled}
        searchable
        showSelectAll={options.length > 1}
        clearable
      />
      {fetchError && <p className="mt-1 text-xs text-red-600">Erro: {fetchError}</p>}
    </div>
  );
}
