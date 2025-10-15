import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import GroupTabs from './components/GroupTabs';
import ParameterTable from './components/ParametersTable';
import { useParameters } from './hooks/useParameters';
import type { ParameterEffective, ParameterListItem } from './types/parameters';
import Layout from '../../../components/Layout';
import { toast } from 'react-toastify'

export default function ParametersPage() {
  const { token } = useAuth();

  // Loja atualmente selecionada (apenas quando houver parâmetros STORE/BOTH)
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  // >>> NOVO: cache local de resultados salvos (para refletir imediatamente na UI)
  const [localApplied, setLocalApplied] = useState<Record<string, { value: any; source: 'GLOBAL' | 'STORE' }>>({});

  // Carrega lista resolvida com ou sem loja
  const { state, groups, groupKeys } = useParameters(token, selectedStoreId);
  const [activeTab, setActiveTab] = useState<string>('');

  React.useEffect(() => {
    if (state !== 'success') return;
    if (groupKeys.length && !groupKeys.includes(activeTab)) setActiveTab(groupKeys[0]);
  }, [state, groupKeys.join('|')]);

  const currentItems = useMemo(() => groups.get(activeTab) || [], [groups, activeTab]);

  // >>> NOVO: aplica overrides locais (valor/source) por code, sem precisar refetch
  const displayedItems = useMemo<ParameterListItem[]>(
    () =>
      currentItems.map((it) => {
        const o = localApplied[it.code];
        return o ? { ...it, value: o.value, source: o.source } : it;
      }),
    [currentItems, localApplied]
  );

  // >>> NOVO: ao trocar de loja, limpe os overrides locais para evitar valores “fantasma”
  React.useEffect(() => {
    setLocalApplied({});
  }, [selectedStoreId]);

  // Exibe o StoreSelect apenas se na aba houver ao menos um parâmetro que aceite/precise loja
  const showStoreSelect = useMemo(
    () => currentItems.some((it) => it.scope === 'STORE' || it.scope === 'BOTH'),
    [currentItems]
  );

  // >>> COMPLETO: atualiza cache local com o retorno do PATCH
  function handleOneSaved(eff: ParameterEffective) {
    setLocalApplied((prev) => ({
      ...prev,
      [eff.code]: { value: eff.value, source: eff.source },
    }));

    toast.success('Parâmetro salvo com sucesso', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',})
    // toast.success('Parâmetro salvo com sucesso');
  }

  return (
    <Layout title="Parâmetros">
      <div className="p-6 space-y-6">
        {/* Mostra um aviso de carregando sem desmontar a tabela */}
        {state === 'loading' && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            Atualizando parâmetros…
          </div>
        )}
        {state === 'error'}
        {(state === 'success' || state === 'loading') && (
          <>
            <GroupTabs tabs={groupKeys} active={activeTab} onChange={setActiveTab} />
            <ParameterTable
              token={token}
              items={displayedItems}
              selectedStoreId={selectedStoreId}
              onChangeStoreId={setSelectedStoreId}
              showStoreSelect={showStoreSelect}
              onOneSaved={handleOneSaved}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
