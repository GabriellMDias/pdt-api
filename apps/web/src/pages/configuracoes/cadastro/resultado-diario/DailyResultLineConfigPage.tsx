import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Layout from "../../../../components/Layout";
import {
  GridForm,
  type Column,
  type Id,
} from "../../../../components/crud/GridForm";
import { useAuth } from "../../../../hooks/useAuth";
import DailyResultLineConfigForm from "./components/DailyResultLineConfigForm";
import { useDailyResultLineConfigCrud } from "./hooks/useDailyResultLineConfigCrud";
import type { Option } from "../../../../components/inputs/MultiSelect";
import type {
  DailyResultLineConfig,
  DailyResultLinePayload,
  VrMasterDreOption,
} from "./types";
import { DETAIL_SOURCE_OPTIONS } from "./types";

export default function DailyResultLineConfigPage() {
  const { token } = useAuth();
  const {
    fetchAll,
    createItem,
    updateItem,
    deleteItem,
    seedDefault,
    fetchVrMasterDreOptions,
  } =
    useDailyResultLineConfigCrud(token);
  const [rows, setRows] = useState<DailyResultLineConfig[]>([]);
  const [dreOptions, setDreOptions] = useState<Option[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const fetchAllWithState = useCallback(async () => {
    void refreshVersion;
    const [data, vrMasterDreOptions] = await Promise.all([
      fetchAll(),
      fetchVrMasterDreOptions().catch(() => [] as VrMasterDreOption[]),
    ]);
    setRows(data);
    setDreOptions(toDreOptions(vrMasterDreOptions));
    return data;
  }, [fetchAll, fetchVrMasterDreOptions, refreshVersion]);

  const lineOptions = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => a.order - b.order || a.id - b.id)
        .map((line) => ({
          value: line.lineId,
          label: `${line.lineId} - ${line.label}`,
        })),
    [rows],
  );

  const columns: Column<DailyResultLineConfig>[] = useMemo(
    () => [
      { key: "order", header: "Ordem", width: "80px" },
      { key: "lineId", header: "ID linha", width: "170px" },
      { key: "label", header: "Descricao", width: "320px" },
      {
        key: "sourceType",
        header: "Tipo",
        width: "150px",
        render: (row) => sourceTypeLabel(row.sourceType),
      },
      {
        key: "format",
        header: "Formato",
        width: "120px",
        render: (row) => formatLabel(row.format),
      },
      {
        key: "distributionStrategy",
        header: "Estrategia",
        width: "240px",
        render: (row) => distributionStrategyLabel(row),
      },
      {
        key: "visible",
        header: "Visivel",
        width: "90px",
        render: (row) => statusBadge(row.visible),
      },
      {
        key: "active",
        header: "Ativa",
        width: "90px",
        render: (row) => statusBadge(row.active),
      },
      {
        key: "detail",
        header: "Detalhe",
        width: "160px",
        render: (row) => detailLabel(row),
      },
      {
        key: "style",
        header: "Destaque",
        width: "140px",
        render: (row) => [
          row.bold ? "Negrito" : null,
          row.shade ? "Fundo" : null,
        ].filter(Boolean).join(" / ") || "-",
      },
    ],
    [],
  );

  return (
    <Layout title="Configurar Resultado Diario">
      <GridForm<DailyResultLineConfig, DailyResultLinePayload, Partial<DailyResultLinePayload>>
        title=""
        idOf={(row) => row.id}
        columns={columns}
        fetchAll={fetchAllWithState}
        createItem={createItem}
        updateItem={(id: Id, data) => updateItem(id, data)}
        deleteItem={deleteItem}
        renderForm={(props) => (
          <DailyResultLineConfigForm
            {...props}
            lineOptions={lineOptions}
            dreOptions={dreOptions}
          />
        )}
        searchPlaceholder="Buscar por ID, descricao, tipo ou origem..."
        canCreate
        canEdit
        canDelete
        actionsForRow={() => [
          {
            key: "seed-default",
            label: "Restaurar seed padrao",
            allowWithoutSelection: true,
            onClick: async () => {
              try {
                await seedDefault();
                setRefreshVersion((value) => value + 1);
                toast.success("Seed padrao aplicado com sucesso.", {
                  position: "top-right",
                  autoClose: 5000,
                  hideProgressBar: false,
                  pauseOnHover: true,
                  draggable: true,
                  theme: "dark",
                });
              } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : String(error), {
                  position: "top-right",
                  autoClose: 5000,
                  hideProgressBar: false,
                  pauseOnHover: true,
                  draggable: true,
                  theme: "dark",
                });
              }
            },
          },
        ]}
      />
    </Layout>
  );
}

function toDreOptions(options: VrMasterDreOption[]): Option[] {
  return options.map((option) => {
    const typeLabel = option.typeLabel ? ` - ${option.typeLabel}` : "";
    const orderLabel =
      option.order !== undefined && option.order !== null
        ? ` ordem ${option.order}`
        : "";

    return {
      value: option.id,
      label: `${option.id} - ${option.description}${typeLabel}${orderLabel}`,
    };
  });
}

function sourceTypeLabel(value: DailyResultLineConfig["sourceType"]) {
  const labels: Record<DailyResultLineConfig["sourceType"], string> = {
    DIRECT_FIELD: "Campo direto",
    PARTICIPATION: "Participacao",
    SUM: "Soma",
    GROUP: "Grupo",
    DRE_VRMASTER: "DRE VRMaster",
  };

  return labels[value] ?? value;
}

function formatLabel(value?: DailyResultLineConfig["format"] | null) {
  if (value === "money") return "Monetario";
  if (value === "percent") return "Percentual";
  return "-";
}

function distributionStrategyLabel(row: DailyResultLineConfig) {
  if (row.sourceType !== "DIRECT_FIELD") return "-";

  const sourceConfig = asRecord(row.sourceConfig);
  const value = sourceConfig?.distributionStrategy;

  if (value === "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT") {
    return "Resultado atual + rateio da diferenca";
  }

  if (value === "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT") {
    return "Base VRMaster + rateio sem centro";
  }

  if (value === "VRMASTER_COST_CENTER_EXACT") {
    return "Base VRMaster exata por centro";
  }

  return "Nao definida";
}

function statusBadge(enabled: boolean) {
  return (
    <span
      className={[
        "rounded-full px-2 py-1 text-xs",
        enabled
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      ].join(" ")}
    >
      {enabled ? "Sim" : "Nao"}
    </span>
  );
}

function detailLabel(row: DailyResultLineConfig) {
  const detailConfig = asRecord(row.detailConfig);
  const defaultDetailSource = DETAIL_SOURCE_OPTIONS.find((option) =>
    option.implementedLineIds.includes(row.lineId),
  );
  const hasDefaultDetail = Boolean(defaultDetailSource && !detailConfig);
  const enabled =
    hasDefaultDetail ||
    (detailConfig?.enabled !== false &&
      detailConfig?.detailEnabled !== false &&
      (detailConfig?.enabled === true ||
        detailConfig?.detailEnabled === true ||
        Boolean(detailConfig?.detailSourceKey || detailConfig?.detailSourceType)));

  if (!enabled) return statusBadge(false);

  const key =
    typeof detailConfig?.detailSourceKey === "string"
      ? detailConfig.detailSourceKey
      : defaultDetailSource
        ? defaultDetailSource.detailSourceKey
        : "-";

  return (
    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
      Sim - {key}
    </span>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
