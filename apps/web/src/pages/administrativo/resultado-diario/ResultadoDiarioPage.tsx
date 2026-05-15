import { useState, useEffect, useRef } from "react";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import UndoIcon from "@mui/icons-material/Undo";
import DateRange from "../../../components/inputs/DateRange";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConstCenterMultiSelect from "../../../components/inputs/CostCenterMultiSelect";
import DefaultButton from "../../../components/inputs/DefaultButton";
import { IconButton } from "../../../components/crud/primitives";
import { fieldControlBaseClass } from "../../../components/inputs/styles";
import { hasPermission, type PermissionBag } from "../../../services/permission";
import {
  DailyResultConsolidationDryRunError,
  useDRE,
  type DailyResultConsolidationConfirmResponse,
  type DailyResultConsolidationDryRunLine,
  type DailyResultConsolidationDryRunResponse,
  type MonthlyResultConsolidationStatusRow,
} from "./hooks/useDRE";
import type { CostCenter, GetDREParams, Store, DREByCostCenter } from "./types";
import DRETable from "./components/DRETable";
import EditarValoresResultadoModal from "./components/EditarValoresResultadoModal";
import FullscreenLoader from "../../../components/loading/FullscreenLoader";
import { toast } from "react-toastify";
import { RESULTADO_DIARIO_LINE_CONFIG, type ResultadoDiarioLineConfig } from "./resultado-diario.config";
import { dailyResultDtosToLineConfig } from "./resultado-diario.api-config";

type ResultadoActionModal = "consolidate" | "edit-values" | null;

const DRE_PARAMETERS_PERMISSION = "dre:configurar-dre";
const DRE_CONSOLIDATION_PERMISSION = "dre:consolidar";
const DRE_EDIT_VALUES_PERMISSION = "dre:editar-valores";

export default function ResultadoDiarioPage() {
  const { token, permissions, userId } = useAuth();
  const navigate = useNavigate();
  const [sp, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);

  const {
    fetchDREData,
    fetchCostCenters,
    fetchStores,
    fetchDailyResultLineConfig,
    fetchMonthlyResultConsolidations,
    fetchDailyResultEditValues,
    saveDailyResultEditValues,
    runDailyResultConsolidationDryRun,
    confirmDailyResultConsolidation,
    reverseMonthlyResultConsolidation,
    fetchResultLineDetails,
  } = useDRE(token);

  // ======= Filtros (sincronizados pelos componentes) =======
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dreRows, setDreRows] = useState<DREByCostCenter[]>([]);
  const [lineConfig, setLineConfig] = useState<readonly ResultadoDiarioLineConfig[]>(RESULTADO_DIARIO_LINE_CONFIG);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionModal, setActionModal] = useState<ResultadoActionModal>(null);
  const actionsWrapRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const canOpenParameters =
    userId === 0 || hasPermission(permissions as PermissionBag, DRE_PARAMETERS_PERMISSION);
  const canConsolidate =
    userId === 0 || hasPermission(permissions as PermissionBag, DRE_CONSOLIDATION_PERMISSION);
  const canEditValues =
    userId === 0 || hasPermission(permissions as PermissionBag, DRE_EDIT_VALUES_PERMISSION);
  const canUseAnyAction = canOpenParameters || canConsolidate || canEditValues;

  useEffect(() => {
    async function fetchData() {
      const ccs = await fetchCostCenters();
      const strs = await fetchStores();
      setCostCenters(ccs);
      setStores(strs);

      try {
        const persistedConfig = dailyResultDtosToLineConfig(await fetchDailyResultLineConfig());
        setLineConfig(persistedConfig.length > 0 ? persistedConfig : RESULTADO_DIARIO_LINE_CONFIG);
      } catch {
        setLineConfig(RESULTADO_DIARIO_LINE_CONFIG);
      }
    }
    fetchData();
  }, [fetchCostCenters, fetchStores, fetchDailyResultLineConfig]);

  useEffect(() => {
    if (!canUseAnyAction) {
      setActionsOpen(false);
    }
  }, [canUseAnyAction]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const element = event.target as Node;
      if (
        actionsMenuRef.current?.contains(element) ||
        actionsWrapRef.current?.contains(element)
      ) {
        return;
      }
      setActionsOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [actionsOpen]);

  function onClickConsultar() {
    const qs = new URLSearchParams(sp);
    setSearchParams(qs, { replace: true });
    consultar();
  }

  async function consultar() {
    try {
      setLoading(true);

      const params: GetDREParams = {
        initialDate: dataInicial,
        finalDate: dataFinal,
        costCenterId: selectedCostCenters,
        storeId: selectedStores,
      };

      if (selectedStores.length === 0) {
        throw Error("Selecione pelo menos uma loja!")
      }

      const dreData = await fetchDREData(params);

      setDreRows(dreData ?? []);
      setLoading(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: 'dark',
      })
      setLoading(false);
    } finally {
      setLoading(false);
    }
    
  }

  return (
    <Layout title="Resultado Diário">
      <FullscreenLoader open={loading} label="Consultando Resultado Diário..." />
      {/* Filtros */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-0 flex-1 sm:min-w-[240px] sm:max-w-[290px] lg:w-[290px] lg:flex-none">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="dre:consultar"
              value={selectedStores}
              onChange={(ids) => setSelectedStores(ids.map(String))}
              placeholder="Selecione as lojas..."
              autoSelectIfSingle
              onlyActive={true}
              className="w-full"
              // URL sync pelo próprio componente
              syncUrl
              urlParamKey="storeIds"
              legacyUrlKeys={["lojas"]}
              replaceHistory
            />
          </div>

          <div className="w-full min-w-0 flex-1 sm:min-w-[240px] sm:max-w-[290px] lg:w-[290px] lg:flex-none">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Centro de Custo
            </label>
            <ConstCenterMultiSelect
              value={selectedCostCenters}
              onChange={(ids) => setSelectedCostCenters(ids.map(String))}
              placeholder="Selecione os centro custos..."
              onlyActive
              className="w-full"
              syncUrl
              urlParamKey="costCenterIds"
              legacyUrlKeys={["centrocustos"]}
              replaceHistory
              autoSelectAll={true}
            />
          </div>

          <div className="w-full min-w-0 shrink-0 sm:w-[392px] sm:min-w-[320px]">
            <DateRange
              start={dataInicial}
              end={dataFinal}
              onChange={({ start, end }) => {
                setDataInicial(start);
                setDataFinal(end);
              }}
              syncUrl
              startKey="initialDate"
              endKey="finalDate"
              startLegacyKeys={["dataInicial", "start"]}
              endLegacyKeys={["dataFinal", "end"]}
              replaceHistory
              autoOrder={false}
            />
          </div>

          <div className="flex items-end">
            <DefaultButton
              type="submit"
              disabled={loading}
              className="w-full md:w-auto"
              onClick={onClickConsultar}
            >
              {loading ? "Consultando..." : "Consultar"}
            </DefaultButton>
          </div>

          {canUseAnyAction && (
            <div className="relative flex items-end sm:ml-auto" ref={actionsWrapRef}>
              <IconButton
                onClick={() => setActionsOpen((current) => !current)}
                variant="primary"
                title="Ações"
              >
                <BoltIcon />
              </IconButton>

              {actionsOpen && (
                <div
                  ref={actionsMenuRef}
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {canOpenParameters && (
                    <button
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        navigate("/configuracoes/cadastro/resultado-diario");
                      }}
                    >
                      Parâmetros DRE
                    </button>
                  )}
                  {canConsolidate && (
                    <button
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        setActionModal("consolidate");
                      }}
                    >
                      Consolidar Resultado
                    </button>
                  )}
                  {canEditValues && (
                    <button
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        setActionModal("edit-values");
                      }}
                    >
                      Editar valores
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabela do DRE */}
      {dreRows.length > 0 && (
        <DRETable
          data={dreRows}
          costCenters={costCenters}
          stores={stores}
          selectedStoreIds={selectedStores}
          start={dataInicial}
          end={dataFinal}
          lineConfig={lineConfig}
          fetchResultLineDetails={fetchResultLineDetails}
        />
      )}

      <ConsolidarResultadoModal
        open={actionModal === "consolidate"}
        selectedStoreIds={selectedStores}
        startDate={dataInicial}
        endDate={dataFinal}
        costCenters={costCenters}
        fetchStatuses={fetchMonthlyResultConsolidations}
        runDryRun={runDailyResultConsolidationDryRun}
        confirmConsolidation={confirmDailyResultConsolidation}
        reverseConsolidation={reverseMonthlyResultConsolidation}
        onClose={() => setActionModal(null)}
      />
      <EditarValoresResultadoModal
        open={actionModal === "edit-values"}
        selectedStoreIds={selectedStores}
        startDate={dataInicial}
        lineConfig={lineConfig}
        fetchEditableValues={fetchDailyResultEditValues}
        saveEditableValues={saveDailyResultEditValues}
        onClose={() => setActionModal(null)}
      />
    </Layout>
  );
}

function ConsolidarResultadoModal({
  open,
  selectedStoreIds,
  startDate,
  endDate,
  costCenters,
  fetchStatuses,
  runDryRun,
  confirmConsolidation,
  reverseConsolidation,
  onClose,
}: {
  open: boolean;
  selectedStoreIds: string[];
  startDate: string;
  endDate: string;
  costCenters: CostCenter[];
  fetchStatuses: (filters: {
    initialMonth: string;
    finalMonth: string;
    storeIds: string[];
  }) => Promise<MonthlyResultConsolidationStatusRow[]>;
  runDryRun: (payload: {
    month: string;
    storeId: string | number;
    lineIds?: string[];
  }) => Promise<DailyResultConsolidationDryRunResponse>;
  confirmConsolidation: (payload: {
    month: string;
    storeId: string | number;
  }) => Promise<DailyResultConsolidationConfirmResponse>;
  reverseConsolidation: (payload: {
    month: string;
    storeId: string | number;
    notes?: string;
  }) => Promise<MonthlyResultConsolidationStatusRow>;
  onClose: () => void;
}) {
  const [initialMonth, setInitialMonth] = useState("");
  const [finalMonth, setFinalMonth] = useState("");
  const [modalStoreIds, setModalStoreIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<MonthlyResultConsolidationStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dryRunLoadingKey, setDryRunLoadingKey] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [reverseLoadingKey, setReverseLoadingKey] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DailyResultConsolidationDryRunResponse | null>(null);
  const [dryRunStoreName, setDryRunStoreName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const startMonth = dateToMonthInput(startDate) || currentMonthInput();
    const endMonth = dateToMonthInput(endDate) || startMonth;

    setInitialMonth(startMonth);
    setFinalMonth(endMonth);
    setModalStoreIds(selectedStoreIds);
    setSearch("");
    setRows([]);
    setDryRunResult(null);
    setDryRunStoreName("");
    setDryRunLoadingKey(null);
    setConfirmLoading(false);
    setReverseLoadingKey(null);
    setError(null);
  }, [endDate, open, selectedStoreIds, startDate]);

  const filteredRows = rows.filter((row) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return [
      row.storeName,
      row.storeId,
      formatMonth(row.month),
      statusLabel(row.status),
      sourceLabel(row.source),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  async function pesquisar() {
    setError(null);
    setDryRunResult(null);
    setDryRunStoreName("");

    if (!initialMonth || !finalMonth) {
      setError("Informe o mes inicial e o mes final.");
      return;
    }

    if (modalStoreIds.length === 0) {
      setError("Selecione pelo menos uma loja.");
      return;
    }

    try {
      setLoading(true);
      const result = await fetchStatuses({
        initialMonth,
        finalMonth,
        storeIds: modalStoreIds,
      });
      setRows(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function simularConsolidacao(row: MonthlyResultConsolidationStatusRow) {
    const key = rowKey(row);
    setError(null);
    setDryRunResult(null);
    setDryRunStoreName("");

    try {
      setDryRunLoadingKey(key);
      const result = await runDryRun({
        month: row.month,
        storeId: row.storeId,
      });
      setDryRunResult(result);
      setDryRunStoreName(row.storeName);
      toast.success("Prévia gerada. Nenhum valor foi gravado ainda.");
    } catch (err: unknown) {
      const message = dryRunErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setDryRunLoadingKey(null);
    }
  }

  async function estornarConsolidacao(row: MonthlyResultConsolidationStatusRow) {
    const confirmed = window.confirm(
      `Estornar a consolidacao de ${row.storeName} em ${formatMonth(row.month)}? Os valores em MonthlyResult serao preservados, mas o Resultado Diario voltara a usar o calculo nao consolidado para este mes/loja.`,
    );

    if (!confirmed) return;

    const key = rowKey(row);
    setError(null);
    setDryRunResult(null);
    setDryRunStoreName("");

    try {
      setReverseLoadingKey(key);
      const result = await reverseConsolidation({
        month: row.month,
        storeId: row.storeId,
        notes: "Estorno solicitado pelo modal Consolidar Resultado",
      });

      setRows((currentRows) =>
        currentRows.map((currentRow) =>
          rowKey(currentRow) === key
            ? {
                ...currentRow,
                ...result,
              }
            : currentRow,
        ),
      );
      toast.success("Consolidacao estornada. Os valores mensais foram preservados.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setReverseLoadingKey(null);
    }
  }

  async function confirmarConsolidacao() {
    if (!dryRunResult) return;

    const blockedLines = dryRunResult.lines.filter((line) => line.blockedReason);
    if (blockedLines.length > 0) {
      toast.error("Resolva as linhas bloqueadas antes de confirmar a consolidacao.");
      return;
    }

    const confirmed = window.confirm(
      `Deseja confirmar a consolidação deste mês? Após confirmar, os valores serão gravados no resultado mensal.\n\n${dryRunStoreName || `Loja ${dryRunResult.storeId}`} - ${formatMonth(dryRunResult.month)}`,
    );

    if (!confirmed) return;

    setError(null);

    try {
      setConfirmLoading(true);
      const result = await confirmConsolidation({
        month: dryRunResult.month,
        storeId: dryRunResult.storeId,
      });

      setRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.storeId === result.storeId &&
          currentRow.month === result.month
            ? {
                ...currentRow,
                status: result.status,
                isConsolidated: true,
                source: result.source,
                consolidatedAt: result.consolidation.consolidatedAt,
                consolidatedByUserId: result.consolidation.consolidatedByUserId,
                notes: result.consolidation.notes,
              }
            : currentRow,
        ),
      );
      setDryRunResult(null);
      setDryRunStoreName("");
      toast.success(
        `Consolidação gravada. ${result.monthlyResult.created} registro(s) criados e ${result.monthlyResult.updated} atualizado(s).`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setConfirmLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/45 px-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-800 dark:text-white">Consolidar Resultado</h2>
          </div>
          <button
            type="button"
            className="text-neutral-500 transition-colors hover:text-neutral-700 dark:text-white/70 dark:hover:text-white"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/45">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Filtros</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Mes inicial</span>
                <input
                  className={fieldControlBaseClass}
                  type="month"
                  value={initialMonth}
                  onChange={(event) => setInitialMonth(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Mes final</span>
                <input
                  className={fieldControlBaseClass}
                  type="month"
                  value={finalMonth}
                  onChange={(event) => setFinalMonth(event.target.value)}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Lojas</span>
                <StoreMultiSelect
                  permissionCode="dre:consultar"
                  value={modalStoreIds}
                  onChange={(ids) => setModalStoreIds(ids.map(String))}
                  placeholder="Selecione as lojas..."
                  onlyActive
                  className="w-full"
                />
              </label>
              <label className="block md:col-span-3">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Pesquisar</span>
                <input
                  className={fieldControlBaseClass}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Loja, mes, status..."
                />
              </label>
              <div className="flex items-end">
                <DefaultButton
                  type="button"
                  disabled={loading}
                  className="w-full"
                  onClick={pesquisar}
                >
                  {loading ? "Pesquisando..." : "Pesquisar"}
                </DefaultButton>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/45">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Listagem</h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900/60">
              <div className="grid grid-cols-[1.4fr_110px_150px_160px_90px] border-b border-neutral-200 bg-neutral-100 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <div className="p-3">Linha</div>
                <div className="p-3">Mes</div>
                <div className="p-3">Status</div>
                <div className="p-3">Origem</div>
                <div className="p-3 text-center">Acao</div>
              </div>
              {filteredRows.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nenhum dado carregado.
                </div>
              ) : (
                <div className="max-h-80 overflow-auto">
                  {filteredRows.map((row) => (
                    <div
                      key={rowKey(row)}
                      className="grid grid-cols-[1.4fr_110px_150px_160px_90px] border-b border-neutral-100 text-sm text-neutral-700 last:border-b-0 dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <div className="p-3">{row.storeName}</div>
                      <div className="p-3">{formatMonth(row.month)}</div>
                      <div className="p-3">
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="p-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {sourceLabel(row.source)}
                      </div>
                      <div className="flex justify-center p-2">
                        <IconButton
                          title={
                            row.isConsolidated
                              ? "Estornar"
                              : "Simular consolidacao das linhas diretas"
                          }
                          disabled={
                            dryRunLoadingKey !== null ||
                            reverseLoadingKey !== null ||
                            confirmLoading
                          }
                          variant={row.isConsolidated ? "danger" : "green"}
                          onClick={() =>
                            row.isConsolidated
                              ? estornarConsolidacao(row)
                              : simularConsolidacao(row)
                          }
                        >
                          {dryRunLoadingKey === rowKey(row) ||
                          reverseLoadingKey === rowKey(row) ? (
                            <span className="px-1 text-xs">...</span>
                          ) : row.isConsolidated ? (
                            <UndoIcon />
                          ) : (
                            <CheckCircleIcon />
                          )}
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {dryRunResult && (
            <ConsolidationDryRunPreview
              result={dryRunResult}
              storeName={dryRunStoreName}
              costCenters={costCenters}
              confirming={confirmLoading}
              onConfirm={confirmarConsolidacao}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ConsolidationDryRunPreview({
  result,
  storeName,
  costCenters,
  confirming,
  onConfirm,
}: {
  result: DailyResultConsolidationDryRunResponse;
  storeName: string;
  costCenters: CostCenter[];
  confirming: boolean;
  onConfirm: () => void;
}) {
  if (result.lines.length === 0) return null;
  const blockedCount = result.lines.filter((line) => line.blockedReason).length;

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Prévia da consolidação
          </h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            Prévia da consolidação. Nenhum valor foi gravado ainda.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm dark:bg-neutral-900 dark:text-blue-200">
          writesEnabled: {String(result.writesEnabled)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <PreviewMetric label="Mes" value={formatMonth(result.month)} />
        <PreviewMetric label="Loja" value={storeName || `Loja ${result.storeId}`} />
        <PreviewMetric
          label="Linhas processadas"
          value={String(result.lines.length)}
        />
        <PreviewMetric
          label="Integracao fiscal"
          value={result.fiscalIntegration.status === "OK" ? "Finalizada" : "Pendente"}
        />
      </div>

      <div className="mt-4 space-y-4">
        {result.lines.map((line) => (
          <DryRunLinePreview
            key={line.lineId}
            line={line}
            costCenters={costCenters}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-blue-200 pt-4 dark:border-blue-900/60">
        {blockedCount > 0 ? (
          <span className="text-sm text-amber-700 dark:text-amber-200">
            {blockedCount} linha(s) bloqueada(s). Corrija antes de confirmar.
          </span>
        ) : (
          <DefaultButton
            type="button"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Confirmando..." : "Confirmar consolidação"}
          </DefaultButton>
        )}
      </div>
    </section>
  );
}

function DryRunLinePreview({
  line,
  costCenters,
}: {
  line: DailyResultConsolidationDryRunLine;
  costCenters: CostCenter[];
}) {
  const statusLabel = line.blockedReason ? "Bloqueada" : "Simulada";
  const dreTerms = line.vrDreTerms.length
    ? line.vrDreTerms
        .map((term) => `${term.multiplier === -1 ? "-" : "+"}#${term.vrDreId}`)
        .join(" ")
    : "-";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {line.label || line.lineId}
          </h4>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {line.lineId} - {distributionStrategyLabel(line.distributionStrategy)}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-medium",
            line.blockedReason
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
          ].join(" ")}
        >
          {statusLabel}
        </span>
      </div>

      {line.blockedReason && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {line.blockedReason}
        </div>
      )}

      {(line.warnings ?? []).length > 0 && (
        <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-200">
          {(line.warnings ?? []).map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <PreviewMetric label="PDT Connect" value={money(line.pdtConnectTotal)} />
        <PreviewMetric
          label="Total Debito VRMaster"
          value={money(line.vrMasterDebitTotal ?? 0)}
        />
        <PreviewMetric
          label="Total Credito VRMaster"
          value={money(line.vrMasterCreditTotal ?? 0)}
        />
        <PreviewMetric
          label="Total Liquido VRMaster"
          value={money(line.vrMasterNetTotal ?? line.vrMasterTotal)}
        />
        <PreviewMetric
          label="VRMaster alocado"
          value={money(line.vrMasterAllocatedTotal ?? line.finalTotal)}
        />
        <PreviewMetric
          label="Sem centro de custo"
          value={money(line.unallocatedValue ?? 0)}
        />
        <PreviewMetric
          label="Rateado por participacao"
          value={money(line.apportionedValue ?? 0)}
        />
        <PreviewMetric label="Diferenca" value={money(line.difference)} />
        <PreviewMetric label="Total final" value={money(line.finalTotal)} />
        <PreviewMetric
          label="Residual aplicado"
          value={money(line.roundingResidualApplied ?? 0)}
        />
        <PreviewMetric label="DRE vinculado" value={dreTerms} />
      </div>

      {line.costCenters.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="min-w-[1080px] bg-white dark:bg-neutral-900/70">
            <div className="grid grid-cols-[90px_1.3fr_120px_110px_130px_130px_120px_130px] border-b border-neutral-200 bg-neutral-100 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <div className="p-3">Loja</div>
              <div className="p-3">Centro de custo</div>
              <div className="p-3 text-right">Valor atual</div>
              <div className="p-3 text-right">Participacao</div>
              <div className="p-3 text-right">VRMaster alocado</div>
              <div className="p-3 text-right">Rateio sem CC</div>
              <div className="p-3 text-right">Ajuste</div>
              <div className="p-3 text-right">Valor final</div>
            </div>
            <div className="max-h-72 overflow-auto">
              {line.costCenters.map((row) => (
                <div
                  key={`${row.storeId}-${row.costCenterId}`}
                  className="grid grid-cols-[90px_1.3fr_120px_110px_130px_130px_120px_130px] border-b border-neutral-100 text-sm text-neutral-700 last:border-b-0 dark:border-neutral-800 dark:text-neutral-200"
                >
                  <div className="p-3">Loja {row.storeId}</div>
                  <div className="p-3">{costCenterLabel(costCenters, row.costCenterId)}</div>
                  <div className="p-3 text-right">{money(row.currentValue)}</div>
                  <div className="p-3 text-right">{percent(row.participation)}</div>
                  <div className="p-3 text-right">
                    {(row.vrMasterValue ?? row.vrMasterAllocatedValue) === undefined
                      ? "-"
                      : money(row.vrMasterValue ?? row.vrMasterAllocatedValue ?? 0)}
                  </div>
                  <div className="p-3 text-right">
                    {row.unallocatedAdjustment === undefined
                      ? "-"
                      : money(row.unallocatedAdjustment)}
                  </div>
                  <div className="p-3 text-right">{money(row.adjustment)}</div>
                  <div className="p-3 text-right font-medium">
                    {money(row.consolidatedValue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-400">
          Sem valores por centro de custo para esta linha.
        </div>
      )}
    </div>
  );
}

function distributionStrategyLabel(
  strategy: DailyResultConsolidationDryRunLine["distributionStrategy"],
) {
  if (strategy === "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT") {
    return "Resultado atual + rateio da diferenca";
  }

  if (strategy === "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT") {
    return "Base VRMaster + rateio sem centro de custo";
  }

  if (strategy === "VRMASTER_COST_CENTER_EXACT") {
    return "Base VRMaster exata por centro de custo";
  }

  return "Estrategia nao configurada";
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/70">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonthlyResultConsolidationStatusRow["status"] }) {
  const isConsolidated = status === "CONSOLIDATED";
  const isReversed = status === "REVERSED";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        isConsolidated
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
          : isReversed
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

function dateToMonthInput(value: string) {
  return /^\d{4}-\d{2}/.exec(value)?.[0] ?? "";
}

function currentMonthInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(value: string) {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[1]}`;
}

function money(value: number) {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function percent(value: number) {
  return `${((value ?? 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function costCenterLabel(costCenters: CostCenter[], costCenterId: number) {
  const costCenter = costCenters.find((item) => item.id === costCenterId);
  return costCenter ? String(costCenter.description) : `Centro ${costCenterId}`;
}

function rowKey(row: MonthlyResultConsolidationStatusRow) {
  return `${row.storeId}-${row.month}`;
}

function dryRunErrorMessage(err: unknown) {
  if (err instanceof DailyResultConsolidationDryRunError) {
    const fiscalIntegration = err.fiscalIntegration;
    const pendingDates =
      (fiscalIntegration?.missingDates.length ?? 0) +
      (fiscalIntegration?.notFinalizedDates.length ?? 0);

    if (pendingDates > 0) {
      return `${err.message} Existem ${pendingDates} dia(s) pendente(s) no mes selecionado.`;
    }

    return err.message;
  }

  return err instanceof Error ? err.message : String(err);
}

function statusLabel(status: MonthlyResultConsolidationStatusRow["status"]) {
  if (status === "CONSOLIDATED") return "Consolidado";
  if (status === "REVERSED") return "Estornado";
  return "Não consolidado";
}

function sourceLabel(source: MonthlyResultConsolidationStatusRow["source"]) {
  if (source === "EXPLICIT_STATUS") return "Controle";
  if (source === "INFERRED_FROM_MONTHLY_RESULT") return "MonthlyResult";
  return "Sem registro";
}
