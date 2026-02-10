import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { toast } from "react-toastify";

import Layout from "../../../components/Layout";
import ContentLoader from "../../../components/loading/ContentLoader";
import DefaultButton from "../../../components/inputs/DefaultButton";
import DefaultInput from "../../../components/inputs/DefaultInput";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";
import { EmptyState, IconButton } from "../../../components/crud/primitives";
import Tag from "../../../components/Tag";

import useRestExcTop from "./hooks/useRestExcTop";
import LookupPicker, { type LookupItem } from "./components/LookupPicker";
import type {
  TipoRestricao,
  TOP,
  TipMov,
  UpdateRestricaoTopBody,
} from "./types";

type Draft = {
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  dirty: boolean;

  restricao: "S" | "N";
  ids: number[];
  series: string[];
};

function isSeriesType(t: TipoRestricao) {
  const d = (t.descricao || "").toLowerCase();
  return t.id === 7 || d.includes("serie") || d.includes("série");
}

function normalize(text: string) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function RestriExcTop() {
  const [tipMov, setTipMov] = useState<TipMov[]>([]);
  const [tipoRestricao, setTipoRestricao] = useState<TipoRestricao[]>([]);
  const [tops, setTops] = useState<TOP[]>([]);
  const [loading, setLoading] = useState(false);

  const [tipMovCollapsed, setTipMovCollapsed] = useState<Record<number, boolean>>({});

  const [topQuery, setTopQuery] = useState("");
  const [selectedTop, setSelectedTop] = useState<TOP | null>(null);
  const [activeTipoRestricaoId, setActiveTipoRestricaoId] = useState<number | null>(null);

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  // cache de labels por tipo restrição (id_tiporestricao) e por id
  const [labelCache, setLabelCache] = useState<Record<number, Record<number, string>>>({});
  const labelFetchInFlight = useRef<Set<string>>(new Set());

  const {
    fetchTops,
    fetchTipMov,
    fetchTipoRestricao,
    fetchRestricaoTop,
    updateRestricaoTop,
    fetchStores,
    fetchSuppliers,
    fetchProducts,
    fetchUsers,
    fetchProductTypes,
  } = useRestExcTop();

  // Carregamento inicial
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const [topsRes, tipMovRes, tipoRes] = await Promise.all([
          fetchTops(),
          fetchTipMov(),
          fetchTipoRestricao(),
        ]);

        if (!active) return;
        setTops(topsRes);
        setTipMov(tipMovRes);
        setTipoRestricao(tipoRes);
        setActiveTipoRestricaoId(tipoRes?.[0]?.id ?? null);
      } catch (err) {
        console.error("Erro ao carregar dados iniciais", err);
        toast.error("Falha ao carregar dados da tela");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [fetchTops, fetchTipMov, fetchTipoRestricao]);

  // Ao trocar TOP, reseta drafts e seleciona primeira aba
  useEffect(() => {
    setDrafts({});
    setActiveTipoRestricaoId(tipoRestricao?.[0]?.id ?? null);
  }, [selectedTop?.id, selectedTop?.tipmov, tipoRestricao]);

  const activeTipoRestricao = useMemo(() => {
    if (!activeTipoRestricaoId) return null;
    return tipoRestricao.find((t) => t.id === activeTipoRestricaoId) || null;
  }, [activeTipoRestricaoId, tipoRestricao]);

  const ensureLabels = useCallback(
    async (tipoId: number, ids: number[]) => {
      // Tipos desconhecidos não possuem endpoint de busca
      const fetchById = async (id: number) => {
        const q = String(id);
        switch (tipoId) {
          case 1: {
            const res = await fetchStores(q, 1, 1);
            const row = res.data?.[0];
            return row ? row.descricao : q;
          }
          case 2: {
            const res = await fetchSuppliers(q, 1, 1);
            const row = res.data?.[0];
            return row ? row.razaosocial : q;
          }
          case 3: {
            const res = await fetchProducts(q, 1, 1);
            const row = res.data?.[0];
            return row ? row.descricaocompleta : q;
          }
          case 5: {
            const res = await fetchUsers(q, 1, 1);
            const row = res.data?.[0];
            return row ? row.nome : q;
          }
          case 6: {
            const res = await fetchProductTypes(q, 1, 1);
            const row = res.data?.[0];
            return row ? row.descricao : q;
          }
          default:
            return q;
        }
      };

      const missing = ids.filter((id) => !(labelCache[tipoId] && labelCache[tipoId][id]));
      if (missing.length === 0) return;

      await Promise.all(
        missing.map(async (id) => {
          const key = `${tipoId}:${id}`;
          if (labelFetchInFlight.current.has(key)) return;
          labelFetchInFlight.current.add(key);
          try {
            const label = await fetchById(id);
            setLabelCache((prev) => ({
              ...prev,
              [tipoId]: {
                ...(prev[tipoId] || {}),
                [id]: label,
              },
            }));
          } catch {
            setLabelCache((prev) => ({
              ...prev,
              [tipoId]: {
                ...(prev[tipoId] || {}),
                [id]: String(id),
              },
            }));
          } finally {
            labelFetchInFlight.current.delete(key);
          }
        })
      );
    },
    [
      fetchStores,
      fetchSuppliers,
      fetchProducts,
      fetchUsers,
      fetchProductTypes,
      labelCache,
    ]
  );

  const loadDraft = useCallback(
    async (tipoId: number) => {
      if (!selectedTop) return;
      setDrafts((prev) => ({
        ...prev,
        [tipoId]: {
          ...(prev[tipoId] || {
            loaded: false,
            loading: false,
            saving: false,
            dirty: false,
            restricao: "S",
            ids: [],
            series: [],
          }),
          loading: true,
        },
      }));

      try {
        const res = await fetchRestricaoTop({
          codtipoper: selectedTop.id,
          tipmov: selectedTop.tipmov,
          tiporestricao: tipoId,
        });

        const draftFromApi: Draft = {
          loaded: true,
          loading: false,
          saving: false,
          dirty: false,
          restricao: "S",
          ids: [],
          series: [],
        };

        if (res && res.restricoes && res.restricoes.length > 0) {
          const r = res.restricoes[0];
          draftFromApi.restricao = r.restricao;
          const ids = (r.codcolrest || [])
            .filter((n) => typeof n === "number" && Number.isFinite(n)) as number[];
          draftFromApi.ids = Array.from(new Set(ids));
          draftFromApi.series = Array.from(new Set(r.series || []));
        }

        setDrafts((prev) => ({
          ...prev,
          [tipoId]: draftFromApi,
        }));

        if (!isSeriesType({ id: tipoId, descricao: "" } as TipoRestricao)) {
          await ensureLabels(tipoId, draftFromApi.ids);
        }
      } catch (e) {
        console.error("Falha ao carregar restrições", e);
        const msg = (e as Error)?.message || "";
        const lower = msg.toLowerCase();
        const isNotFound = lower.includes("404") || lower.includes("not found");
        if (!isNotFound) toast.error("Falha ao carregar restrições desta aba");
        setDrafts((prev) => ({
          ...prev,
          [tipoId]: {
            loaded: true,
            loading: false,
            saving: false,
            dirty: false,
            restricao: "S",
            ids: [],
            series: [],
          },
        }));
      }
    },
    [ensureLabels, fetchRestricaoTop, selectedTop]
  );

  // Ao trocar a aba ativa, carrega o draft sob demanda
  useEffect(() => {
    if (!selectedTop) return;
    if (!activeTipoRestricaoId) return;
    const d = drafts[activeTipoRestricaoId];
    if (d?.loaded || d?.loading) return;
    loadDraft(activeTipoRestricaoId);
  }, [activeTipoRestricaoId, drafts, loadDraft, selectedTop]);

  const filteredTops = useMemo(() => {
    const q = normalize(topQuery);
    if (!q) return tops;
    return tops.filter((t) => {
      const idStr = String(t.id);
      const desc = normalize(t.descricao);
      return idStr.includes(q) || desc.includes(q);
    });
  }, [topQuery, tops]);

  const tipMovMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const tm of tipMov) m.set(tm.id, tm.descricao);
    return m;
  }, [tipMov]);

  const groupedTops = useMemo(() => {
    const groups = new Map<number, TOP[]>();
    for (const t of filteredTops) {
      if (!groups.has(t.tipmov)) groups.set(t.tipmov, []);
      groups.get(t.tipmov)!.push(t);
    }

    // Ordena TOPs por id dentro de cada grupo
    const arr = Array.from(groups.entries()).map(([tip, list]) => ({
      tipmov: tip,
      label: tipMovMap.get(tip) || `TIPMOV ${tip}`,
      items: list.sort((a, b) => a.id - b.id),
    }));
    // Ordena grupos por tipmov
    return arr.sort((a, b) => a.tipmov - b.tipmov);
  }, [filteredTops, tipMovMap]);

  const setDraftField = useCallback(
    (tipoId: number, patch: Partial<Draft>) => {
      setDrafts((prev) => {
        const curr = prev[tipoId] || {
          loaded: true,
          loading: false,
          saving: false,
          dirty: false,
          restricao: "S" as const,
          ids: [],
          series: [],
        };
        return {
          ...prev,
          [tipoId]: {
            ...curr,
            ...patch,
            dirty: patch.dirty ?? true,
          },
        };
      });
    },
    []
  );

  const addItem = useCallback(
    async (tipoId: number, item: LookupItem) => {
      setLabelCache((prev) => ({
        ...prev,
        [tipoId]: {
          ...(prev[tipoId] || {}),
          [item.id]: item.label,
        },
      }));

      setDrafts((prev) => {
        const curr =
          prev[tipoId] ||
          ({
            loaded: true,
            loading: false,
            saving: false,
            dirty: false,
            restricao: "S",
            ids: [],
            series: [],
          } as Draft);

        if (curr.ids.includes(item.id)) return prev;

        return {
          ...prev,
          [tipoId]: {
            ...curr,
            ids: [...curr.ids, item.id].sort((a, b) => a - b),
            dirty: true,
          },
        };
      });
    },
    []
  );

  const removeItem = useCallback((tipoId: number, id: number) => {
    setDrafts((prev) => {
      const curr = prev[tipoId];
      if (!curr) return prev;
      return {
        ...prev,
        [tipoId]: {
          ...curr,
          ids: curr.ids.filter((x) => x !== id),
          dirty: true,
        },
      };
    });
  }, []);

  const removeSeries = useCallback((tipoId: number, serie: string) => {
    setDrafts((prev) => {
      const curr = prev[tipoId];
      if (!curr) return prev;
      return {
        ...prev,
        [tipoId]: {
          ...curr,
          series: curr.series.filter((s) => s !== serie),
          dirty: true,
        },
      };
    });
  }, []);

  const save = useCallback(async () => {
    if (!selectedTop || !activeTipoRestricaoId) return;
    const tipoId = activeTipoRestricaoId;
    const d = drafts[tipoId];
    if (!d) return;
    if (!d.dirty) {
      toast.info("Não há alterações para salvar");
      return;
    }

    const isSerie = activeTipoRestricao ? isSeriesType(activeTipoRestricao) : tipoId === 7;

    const body: UpdateRestricaoTopBody = {
      codtipoper: selectedTop.id,
      id_tipmov: selectedTop.tipmov,
      id_tiporestricao: tipoId,
      restricao: d.restricao,
      codcolrest: isSerie ? [] : d.ids,
      ...(isSerie ? { series: d.series } : {}),
    };

    setDrafts((prev) => ({
      ...prev,
      [tipoId]: {
        ...prev[tipoId],
        saving: true,
      },
    }));

    try {
      const saved = await updateRestricaoTop(body);
      const r = (saved?.restricoes || [])[0];
      const next: Draft = {
        loaded: true,
        loading: false,
        saving: false,
        dirty: false,
        restricao: r?.restricao || d.restricao,
        ids: Array.from(
          new Set(
            (r?.codcolrest || [])
              .filter((n) => typeof n === "number" && Number.isFinite(n)) as number[]
          )
        ).sort((a, b) => a - b),
        series: Array.from(new Set(r?.series || [])).sort(),
      };
      setDrafts((prev) => ({
        ...prev,
        [tipoId]: next,
      }));

      if (!isSerie) {
        await ensureLabels(tipoId, next.ids);
      }
      toast.success("Alterações salvas");
    } catch (e) {
      console.error("Falha ao salvar", e);
      toast.error("Falha ao salvar alterações");
      setDrafts((prev) => ({
        ...prev,
        [tipoId]: {
          ...prev[tipoId],
          saving: false,
        },
      }));
    }
  }, [activeTipoRestricao, activeTipoRestricaoId, drafts, ensureLabels, selectedTop, updateRestricaoTop]);

  const draft = activeTipoRestricaoId ? drafts[activeTipoRestricaoId] : undefined;

  const selectedRows = useMemo(() => {
    if (!draft || !activeTipoRestricaoId) return [];
    return draft.ids.map((id) => ({
      id,
      descricao: labelCache[activeTipoRestricaoId]?.[id] || "(carregando...)",
    }));
  }, [activeTipoRestricaoId, draft, labelCache]);

  const selectedColumns = useMemo<Column<{ id: number; descricao: string }>[]>(
    () => [
      {
        key: "id",
        header: "Código",
        cell: (r) => r.id,
        width: 120,
        thClassName: "w-[120px]",
        tdClassName: "w-[120px]",
      },
      {
        key: "descricao",
        header: "Descrição",
        cell: (r) => r.descricao,
        overflow: "wrap",
      },
      {
        key: "actions",
        header: "",
        cell: (r) => (
          <div className="flex justify-end">
            <IconButton
              title="Remover"
              variant="danger"
              onClick={() => activeTipoRestricaoId && removeItem(activeTipoRestricaoId, r.id)}
              disabled={!activeTipoRestricaoId}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        ),
        width: 64,
        thClassName: "w-[64px]",
        tdClassName: "w-[64px]",
      },
    ],
    [activeTipoRestricaoId, removeItem]
  );

  const renderLookupPicker = () => {
    if (!activeTipoRestricaoId) return null;

    const tipoId = activeTipoRestricaoId;
    const selectedIds = new Set(draft?.ids || []);

    if (tipoId === 1) {
      return (
        <LookupPicker
          title="Buscar lojas"
          selectedIds={selectedIds}
          fetchPage={(q, page, limit) => fetchStores(q, page, limit)}
          mapRow={(row: any) => ({ id: row.id, label: row.descricao })}
          onAdd={(item) => addItem(tipoId, item)}
        />
      );
    }
    if (tipoId === 2) {
      return (
        <LookupPicker
          title="Buscar fornecedores"
          selectedIds={selectedIds}
          fetchPage={(q, page, limit) => fetchSuppliers(q, page, limit)}
          mapRow={(row: any) => ({ id: row.id, label: row.razaosocial })}
          onAdd={(item) => addItem(tipoId, item)}
        />
      );
    }
    if (tipoId === 3) {
      return (
        <LookupPicker
          title="Buscar produtos"
          selectedIds={selectedIds}
          fetchPage={(q, page, limit) => fetchProducts(q, page, limit)}
          mapRow={(row: any) => ({ id: row.id, label: row.descricaocompleta })}
          onAdd={(item) => addItem(tipoId, item)}
        />
      );
    }
    if (tipoId === 5) {
      return (
        <LookupPicker
          title="Buscar usuários"
          selectedIds={selectedIds}
          fetchPage={(q, page, limit) => fetchUsers(q, page, limit)}
          mapRow={(row: any) => ({ id: row.id, label: row.nome })}
          onAdd={(item) => addItem(tipoId, item)}
        />
      );
    }
    if (tipoId === 6) {
      return (
        <LookupPicker
          title="Buscar tipos de produto"
          selectedIds={selectedIds}
          fetchPage={(q, page, limit) => fetchProductTypes(q, page, limit)}
          mapRow={(row: any) => ({ id: row.id, label: row.descricao })}
          onAdd={(item) => addItem(tipoId, item)}
        />
      );
    }

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
        Este tipo de restrição ainda não possui busca dedicada.
      </div>
    );
  };

  const titleRight = selectedTop
    ? `${selectedTop.id} - ${selectedTop.descricao} - ${tipMov.find((it) => it.id === selectedTop.tipmov)?.descricao} `
    : "Selecione uma TOP";

  const anyOverlay = loading || !!draft?.saving;

  return (
  <Layout title="Restrições/Exceções da TOP">
    {/* padding inferior geral */}
    <div className="relative pb-4 text-neutral-800 dark:text-neutral-100">
      <ContentLoader
        open={anyOverlay}
        label={draft?.saving ? "Salvando..." : "Carregando..."}
      />

      {/* trava a altura no desktop e impede scroll da página */}
      <div className="lg:h-[calc(100vh-80px)] lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:h-full min-h-0">
          {/* Painel esquerda */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-black lg:col-span-1 flex flex-col lg:h-full min-h-0 dark:border-neutral-700 dark:bg-neutral-900/35 dark:text-neutral-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-base font-semibold">Tipos de Operação</div>
            </div>

            <DefaultInput
              value={topQuery}
              onChange={(e) => setTopQuery(e.target.value)}
              placeholder="Buscar TOP por código ou descrição"
              className="w-full"
            />

            {/* scroll só aqui */}
            <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
              {groupedTops.length === 0 ? (
                <EmptyState title="Nenhuma TOP encontrada" description="Ajuste o filtro de busca." />
              ) : (
                <div className="space-y-4">
                  {groupedTops.map((g) => (
                    <div key={g.tipmov}>
                      <div className="sticky top-0 z-10 bg-white pb-1 dark:bg-neutral-900/35">
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-xs text-gray-600 hover:bg-gray-50 cursor-pointer dark:text-neutral-300 dark:hover:bg-neutral-800"
                          onClick={() =>
                            setTipMovCollapsed((prev) => ({
                              ...prev,
                              [g.tipmov]: !prev[g.tipmov],
                            }))
                          }
                          title={tipMovCollapsed[g.tipmov] ? "Maximizar" : "Minimizar"}
                        >
                          {tipMovCollapsed[g.tipmov] ? (
                            <KeyboardArrowRightIcon fontSize="small" />
                          ) : (
                            <KeyboardArrowDownIcon fontSize="small" />
                          )}
                          <span className="font-semibold">{g.label}</span>
                          <span className="ml-auto text-[11px] text-gray-400 dark:text-neutral-500">{g.items.length}</span>
                        </button>
                      </div>

                      {!tipMovCollapsed[g.tipmov] && (
                        <div className="mt-2 space-y-1">
                          {g.items.map((t) => {
                            const selected =
                              selectedTop?.id === t.id && selectedTop?.tipmov === t.tipmov;
                            return (
                              <button
                                key={`${t.tipmov}-${t.id}`}
                                className={
                                  "w-full text-left rounded-lg border px-2 py-2 transition cursor-pointer " +
                                  (selected
                                    ? "border-pilar-green bg-pilar-green/10 dark:bg-pilar-green/20"
                                    : "border-gray-200 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800")
                                }
                                onClick={() => setSelectedTop(t)}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-16 shrink-0 font-mono text-xs text-gray-700 dark:text-neutral-300">
                                    {t.id}
                                  </div>
                                  <div className="flex-1 text-sm text-gray-900 dark:text-neutral-100">{t.descricao}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Painel direita */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-black lg:col-span-3 flex flex-col lg:h-full min-h-0 dark:border-neutral-700 dark:bg-neutral-900/35 dark:text-neutral-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-base font-semibold">{titleRight}</div>
              </div>

              <div className="flex items-center gap-2">
                <DefaultButton
                  onClick={save}
                  iconLeft={<SaveIcon />}
                  type="button"
                  disabled={!selectedTop || !draft || draft.loading || draft.saving || !draft.dirty}
                >
                  Salvar
                </DefaultButton>
              </div>
            </div>

            {!selectedTop ? (
              <div className="mt-6 flex-1 min-h-0 overflow-y-auto pb-4">
                <EmptyState
                  title="Selecione uma TOP"
                  description="Escolha uma TOP no painel da esquerda para editar restrições e exceções."
                />
              </div>
            ) : (
              <div className="mt-4 flex-1 min-h-0 flex flex-col">
                {/* Tabs fixas, sem scroll */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-neutral-700">
                  {tipoRestricao.map((t) => {
                    const active = t.id === activeTipoRestricaoId;
                    return (
                      <button
                        key={t.id}
                        className={
                          "rounded-full px-3 py-1 text-sm border cursor-pointer " +
                          (active
                            ? "bg-pilar-green text-white border-pilar-green"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800")
                        }
                        onClick={() => setActiveTipoRestricaoId(t.id)}
                      >
                        {t.descricao}
                      </button>
                    );
                  })}
                </div>

                {/* scroll só aqui (conteúdo grande, tabelas etc) */}
                <div className="mt-4 flex-1 min-h-0 overflow-hidden pr-1">
                  {(!activeTipoRestricaoId || !activeTipoRestricao) ? (
                    <EmptyState
                      title="Sem tipos de restrição"
                      description="Nenhum tipo de restrição encontrado."
                    />
                  ) : (
                    <div className="space-y-4">
                      {draft?.loading ? (
                        <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300">
                          Carregando configuração desta aba...
                        </div>
                      ) : (
                        <>
                          {isSeriesType(activeTipoRestricao) ? (
                            <SeriesEditor
                              value={draft?.series || []}
                              onAdd={(serie) => {
                                if (!activeTipoRestricaoId || !serie) return;
                                setDrafts((prev) => {
                                  const curr = prev[activeTipoRestricaoId];
                                  if (!curr) return prev;
                                  if (curr.series.includes(serie)) return prev;
                                  return {
                                    ...prev,
                                    [activeTipoRestricaoId]: {
                                      ...curr,
                                      series: [...curr.series, serie].sort(),
                                      dirty: true,
                                    },
                                  };
                                });
                              }}
                              onRemove={(serie) =>
                                activeTipoRestricaoId && removeSeries(activeTipoRestricaoId, serie)
                              }
                            />
                          ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              <div className="space-y-4">{renderLookupPicker()}</div>

                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-gray-800 dark:text-neutral-100">Itens cadastrados</div>

                                <div className="mt-3 flex items-center gap-3">
                                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer font-bold">
                                    <input
                                      type="radio"
                                      name="restricao"
                                      checked={draft?.restricao === "S"}
                                      onChange={() =>
                                        activeTipoRestricaoId &&
                                        setDraftField(activeTipoRestricaoId, { restricao: "S" })
                                      }
                                    />
                                    Só pode ser usado com
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer font-bold">
                                    <input
                                      type="radio"
                                      name="restricao"
                                      checked={draft?.restricao === "N"}
                                      onChange={() =>
                                        activeTipoRestricaoId &&
                                        setDraftField(activeTipoRestricaoId, { restricao: "N" })
                                      }
                                    />
                                    Não pode ser usado com
                                  </label>
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/30">
                                  <SimpleTable
                                    columns={selectedColumns}
                                    data={selectedRows}
                                    emptyMessage="Nenhum item cadastrado."
                                    tableClassName="w-full text-sm text-left text-neutral-800 dark:text-neutral-100"
                                    headerWrapperClassName="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200"
                                    headerCellClassName="border-b border-gray-200 dark:border-neutral-700"
                                    bodyClassName="text-sm text-neutral-700 dark:text-neutral-200"
                                    cellBaseClassName="border-b border-gray-200/70 dark:border-neutral-700"
                                    getRowKey={(r) => r.id}
                                    stickyHeader
                                    wrapperClassName="max-h-[60vh] overflow-y-auto"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </Layout>
);
}

function SeriesEditor({
  value,
  onAdd,
  onRemove,
}: {
  value: string[];
  onAdd: (serie: string) => void;
  onRemove: (serie: string) => void;
}) {
  const [serie, setSerie] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="text-sm font-semibold text-gray-800 dark:text-neutral-100">Séries</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
            Este tipo armazena um array de strings (sem lookup específico).
          </div>

          <div className="mt-3 flex gap-2">
            <DefaultInput
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="Digite a série e pressione Incluir"
              className="flex-1"
            />
            <DefaultButton
              type="button"
              onClick={() => {
                const s = serie.trim();
                if (!s) return;
                onAdd(s);
                setSerie("");
              }}
            >
              Incluir
            </DefaultButton>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="text-sm font-semibold text-gray-800 dark:text-neutral-100">Itens cadastrados</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {value.length === 0 ? (
              <span className="text-sm text-gray-500 dark:text-neutral-400">Nenhuma série cadastrada.</span>
            ) : (
              value.map((s) => (
                <Tag key={s} className="border-gray-300 text-gray-800 dark:border-neutral-600 dark:text-neutral-200">
                  <span>{s}</span>
                  <button
                    type="button"
                    className="ml-2 cursor-pointer text-gray-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                    onClick={() => onRemove(s)}
                    title="Remover"
                  >
                    ×
                  </button>
                </Tag>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
