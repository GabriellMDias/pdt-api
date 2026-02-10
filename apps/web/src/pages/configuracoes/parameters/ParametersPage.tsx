import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import GroupTabs from "./components/GroupTabs";
import ParameterTable from "./components/ParametersTable";
import { useParameters } from "./hooks/useParameters";
import type { ParameterEffective, ParameterListItem } from "./types/parameters";

export default function ParametersPage() {
  const { token } = useAuth();

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [localApplied, setLocalApplied] = useState<
    Record<string, { value: unknown; source: "GLOBAL" | "STORE" }>
  >({});

  const { state, groups, groupKeys, error } = useParameters(token, selectedStoreId);
  const [activeTab, setActiveTab] = useState<string>("");

  React.useEffect(() => {
    if (state !== "success") return;
    if (groupKeys.length && !groupKeys.includes(activeTab)) setActiveTab(groupKeys[0]);
  }, [state, groupKeys, activeTab]);

  const currentItems = useMemo(() => groups.get(activeTab) || [], [groups, activeTab]);

  const displayedItems = useMemo<ParameterListItem[]>(
    () =>
      currentItems.map((it) => {
        const local = localApplied[it.code];
        return local ? { ...it, value: local.value, source: local.source } : it;
      }),
    [currentItems, localApplied],
  );

  React.useEffect(() => {
    setLocalApplied({});
  }, [selectedStoreId]);

  const showStoreSelect = useMemo(
    () => currentItems.some((it) => it.scope === "STORE" || it.scope === "BOTH"),
    [currentItems],
  );

  function handleOneSaved(eff: ParameterEffective) {
    setLocalApplied((prev) => ({
      ...prev,
      [eff.code]: { value: eff.value, source: eff.source },
    }));

    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    toast.success("Parametro salvo com sucesso.", {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      pauseOnHover: true,
      draggable: true,
      theme,
    });
  }

  return (
    <Layout title="Parametros">
      <div className="space-y-5 p-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-pilar-default-bg-dark/40">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Configuracao de Parametros
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Gerencie valores globais e overrides por loja de forma centralizada.
          </p>
        </section>

        {state === "loading" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:border-white/10 dark:bg-pilar-default-bg-dark/35 dark:text-neutral-300">
            Atualizando parametros...
          </div>
        )}

        {state === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            Falha ao carregar parametros{error ? `: ${error}` : "."}
          </div>
        )}

        {(state === "success" || state === "loading") && (
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-pilar-default-bg-dark/25">
            <GroupTabs tabs={groupKeys} active={activeTab} onChange={setActiveTab} />

            {groupKeys.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-8 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-pilar-default-bg-dark/35 dark:text-neutral-400">
                Nenhum grupo de parametro encontrado.
              </div>
            ) : (
              <ParameterTable
                token={token}
                items={displayedItems}
                selectedStoreId={selectedStoreId}
                onChangeStoreId={setSelectedStoreId}
                showStoreSelect={showStoreSelect}
                onOneSaved={handleOneSaved}
              />
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
