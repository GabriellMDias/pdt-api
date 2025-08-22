import { useEffect, useMemo, useState } from 'react';
import MultiSelect, { type Option } from './MultiSelect';
import { useAuth } from '../../hooks/useAuth';

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
};

const API_BASE = '';

function authHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Input reutilizável para seleção de lojas com respeito às permissões por loja.
 */
export default function StoreMultiSelect({
  permissionCode,
  value,
  onChange,
  placeholder = 'Selecione as lojas...',
  autoSelectIfSingle = true,
  onlyActive = false,
  className,
}: Props) {
  const { token, permissions } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Busca lojas
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setFetchError(null);
    fetch(`${API_BASE}/api/stores`, { signal: ac.signal, headers: authHeaders(token) })
      .then(async (r) => {
        if (!r.ok) throw new Error('Falha ao carregar lojas');
        return r.json();
      })
      .then((data: Store[]) => setStores(data.filter((str) => str.id !== 0)))
      .catch((e) => {
        if (e.name !== 'AbortError') setFetchError(String(e.message || e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [token]);

  // Calcula lojas permitidas conforme permissão
  const allowedIds: number[] | null = useMemo(() => {
    const perm = (permissions as Permission[] | undefined)?.find((p) => p.code === permissionCode);
    if (!perm) return [];                        // não possui a permissão -> nenhuma loja
    if (!perm.useStorePermission) return null;   // sem restrição por loja
    if (perm.global) return null;                // acesso global -> todas as lojas
    return Array.isArray(perm.stores) ? perm.stores : [];
  }, [permissions, permissionCode]);

  // Aplica filtros (status e permissão)
  const filteredStores = useMemo(() => {
    const base = onlyActive ? stores.filter((s) => s.activeStatus) : stores;
    if (allowedIds === null) return base; // sem restrição
    const set = new Set(allowedIds.map(String));
    return base.filter((s) => set.has(String(s.id)));
  }, [stores, onlyActive, allowedIds]);

  // Normaliza seleção para não conter IDs não permitidos
  useEffect(() => {
    const allowedSet = new Set(filteredStores.map((s) => String(s.id)));
    const normalized = value.filter((v) => allowedSet.has(String(v)));
    if (normalized.length !== value.length) onChange(normalized);
    // Auto-seleção quando só há 1 loja disponível
    if (autoSelectIfSingle && normalized.length === 0 && filteredStores.length === 1) {
      onChange([filteredStores[0].id]);
    }
  }, [filteredStores, value, onChange, autoSelectIfSingle]);

  const options: Option[] = useMemo(
    () =>
      filteredStores.map((s) => ({
        value: s.id,
        label: `${s.description || s.storeName} (#${s.id})`,
      })),
    [filteredStores]
  );

  const disabled = loading || !!fetchError || options.length === 0;

  return (
    <div className={className}>
      <MultiSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={
          loading
            ? 'Carregando lojas...'
            : fetchError
            ? 'Erro ao carregar lojas'
            : options.length
            ? placeholder
            : 'Sem lojas disponíveis'
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
