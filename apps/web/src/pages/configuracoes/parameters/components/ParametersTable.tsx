import { useEffect, useMemo, useState } from "react";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import StoreSelect from "../../../../components/inputs/StoreSelect";
import Tag from "../../../../components/Tag";
import SimpleTable, { type Column } from "../../../../components/table/SimpleTable";
import { patchParameter } from "../services/parametersApi";
import type { ParameterEffective, ParameterListItem } from "../types/parameters";
import { ValueEditor } from "./ValueEditors";

type RowState = {
  value: unknown;
  saving: boolean;
  error: string | null;
};

function normalizeForEditor(type: ParameterListItem["type"], value: unknown) {
  switch (type) {
    case "BOOL": {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        const s = value.trim().toLowerCase();
        if (s === "true" || s === "1") return true;
        if (s === "false" || s === "0" || s === "") return false;
      }
      return !!value;
    }
    case "INT": {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "number" && Number.isInteger(value)) return value;
      const s = String(value).trim();
      return /^-?\d+$/.test(s) ? Number(s) : null;
    }
    case "JSON": {
      if (value == null || value === "") return null;
      if (typeof value === "object") return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return null;
    }
    case "STRING":
    default:
      return value == null ? "" : String(value);
  }
}

function toWireString(value: unknown, type: ParameterListItem["type"]): string {
  switch (type) {
    case "STRING":
      return value == null ? "" : String(value);
    case "INT": {
      if (value == null || value === "") return "";
      const s = String(value).trim();
      if (/^-?\d+$/.test(s)) return s;
      throw new Error("Valor invalido: esperado inteiro.");
    }
    case "BOOL":
      return value ? "true" : "false";
    case "JSON": {
      if (value == null || value === "") return "";
      try {
        return JSON.stringify(value);
      } catch {
        throw new Error("JSON invalido.");
      }
    }
    default:
      return String(value ?? "");
  }
}

export default function ParameterTable({
  token,
  items,
  selectedStoreId,
  onChangeStoreId,
  showStoreSelect,
  onOneSaved,
}: {
  token: string | null | undefined;
  items: ParameterListItem[];
  selectedStoreId: number | null;
  onChangeStoreId: (id: number | null) => void;
  showStoreSelect: boolean;
  onOneSaved: (eff: ParameterEffective) => void;
}) {
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  useEffect(() => {
    setRowState(() => {
      const next: Record<string, RowState> = {};
      for (const it of items) {
        next[it.code] = {
          value: normalizeForEditor(it.type, it.value),
          saving: false,
          error: null,
        };
      }
      return next;
    });
  }, [items]);

  function updateRow(code: string, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || { value: undefined, saving: false, error: null }),
        ...patch,
      },
    }));
  }

  function isDisabled(it: ParameterListItem): boolean {
    if (it.scope === "GLOBAL") return false;
    if (it.scope === "STORE") return !selectedStoreId;
    return false;
  }

  function helperText(it: ParameterListItem): string | undefined {
    if (it.scope === "STORE" && !selectedStoreId) {
      return "Selecione uma loja para salvar (escopo STORE).";
    }
    if (it.scope === "BOTH" && !selectedStoreId) {
      return "Sem loja selecionada: sera salvo como GLOBAL.";
    }
    if (it.scope === "BOTH" && selectedStoreId) {
      return `Sera salvo override para a loja #${selectedStoreId}.`;
    }
    return undefined;
  }

  async function handleSave(it: ParameterListItem) {
    const st = rowState[it.code] || { value: it.value, saving: false, error: null };
    const mustStore = it.scope === "STORE";
    const useStore = it.scope === "STORE" || (it.scope === "BOTH" && selectedStoreId != null);
    const sid = useStore ? (selectedStoreId ?? undefined) : undefined;

    if (mustStore && !sid) {
      updateRow(it.code, { error: "Selecione uma loja para salvar este parametro." });
      return;
    }

    let wire: string;
    try {
      wire = toWireString(st.value, it.type);
    } catch (error) {
      updateRow(it.code, {
        error: error instanceof Error ? error.message : "Valor invalido.",
      });
      return;
    }

    updateRow(it.code, { saving: true, error: null });
    try {
      const eff = await patchParameter(token, it.code, wire, sid);
      onOneSaved(eff);
    } catch (error) {
      updateRow(it.code, {
        saving: false,
        error: error instanceof Error ? error.message : "Erro ao salvar.",
      });
      return;
    }
    updateRow(it.code, { saving: false });
  }

  const columns: Column<ParameterListItem>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Codigo",
        width: 260,
        resizable: true,
        sortable: true,
        sortAccessor: (r) => r.code,
        cell: (row) => <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{row.code}</span>,
        overflow: "ellipsis",
      },
      {
        key: "description",
        header: "Descricao",
        width: 360,
        resizable: true,
        sortable: true,
        sortAccessor: (r) => r.description ?? "",
        cell: (row) => <span className="text-sm text-neutral-700 dark:text-neutral-200">{row.description}</span>,
        overflow: "wrap",
      },
      {
        key: "type",
        header: "Tipo",
        width: 120,
        resizable: true,
        cell: (row) => (
          <Tag className="border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200">
            {row.type}
          </Tag>
        ),
        align: "left",
      },
      {
        key: "source",
        header: "Fonte",
        width: 130,
        resizable: true,
        cell: (row) => (
          <Tag
            className={
              row.source === "STORE"
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-200"
                : "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-200"
            }
          >
            {row.source || "-"}
          </Tag>
        ),
        align: "left",
      },
      {
        key: "value",
        header: "Valor",
        width: 520,
        resizable: true,
        cell: (row) => {
          const st = rowState[row.code] || { value: row.value, saving: false, error: null };
          const disabled = isDisabled(row) || st.saving;
          const hint = helperText(row);

          return (
            <div className="space-y-1.5">
              <ValueEditor
                type={row.type}
                value={st.value}
                onChange={(v) => updateRow(row.code, { value: v })}
                disabled={disabled}
              />
              {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
              {st.error && <p className="text-xs text-red-600 dark:text-red-300">{st.error}</p>}
            </div>
          );
        },
        overflow: "wrap",
      },
      {
        key: "action",
        header: "Acao",
        width: 140,
        resizable: true,
        cell: (row) => {
          const st = rowState[row.code] || { value: row.value, saving: false, error: null };
          const disabled = isDisabled(row) || st.saving;

          return (
            <DefaultButton
              onClick={() => handleSave(row)}
              className="rounded-lg px-3 py-1.5 text-sm"
              disabled={disabled}
            >
              {st.saving ? "Salvando..." : "Salvar"}
            </DefaultButton>
          );
        },
        align: "left",
      },
    ],
    [rowState, selectedStoreId],
  );

  return (
    <div className="space-y-3">
      {showStoreSelect && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-pilar-default-bg-dark/35">
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            Loja para visualizar/editar overrides por loja:
          </span>
          <div className="min-w-[260px] flex-1 sm:max-w-xs">
            <StoreSelect
              value={selectedStoreId}
              onChange={onChangeStoreId}
              placeholder="Selecione a loja..."
              syncUrl={false}
              onlyActive
            />
          </div>
        </div>
      )}

      <SimpleTable<ParameterListItem>
        columns={columns}
        data={items}
        loading={false}
        emptyMessage={
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum parametro encontrado para este grupo.
          </span>
        }
        wrapperClassName="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-pilar-default-bg-dark/30"
        tableClassName="w-full text-left text-sm text-neutral-800 dark:text-neutral-100"
        headerWrapperClassName="bg-neutral-100 text-neutral-700 dark:bg-pilar-default-bg2-dark dark:text-neutral-200"
        headerCellClassName="font-semibold"
        rowBaseClassName="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50/80 dark:border-white/10 dark:hover:bg-white/5"
        cellBaseClassName="align-top"
        stickyHeader={false}
        getRowKey={(r) => r.code}
      />
    </div>
  );
}
