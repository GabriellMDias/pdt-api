/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, ConfirmDialog, EmptyState } from "./primitives";

// Ícones
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TableRowsIcon from "@mui/icons-material/TableRows";
import EditNoteIcon from "@mui/icons-material/EditNote";
import BoltIcon from "@mui/icons-material/Bolt";

export type Id = string | number;

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
};

export type FetchParams = { search?: string };

type RowAction<T> = {
  key: string;
  label: string;
  disabled?: boolean;
  allowWithoutSelection?: boolean;
  onClick: (row: T) => void | Promise<void>;
};

export type GridFormProps<T, TCreate, TUpdate> = {
  title: string;
  idOf: (row: T) => Id;
  columns: Column<T>[];
  fetchAll: (params: FetchParams) => Promise<T[]>;
  createItem: (data: TCreate) => Promise<void>;
  updateItem: (id: Id, data: TUpdate) => Promise<void>;
  deleteItem: (id: Id) => Promise<void>;
  renderForm: (args: {
    initial?: Partial<T>;
    onCancel: () => void;
    onSubmit: (payload: TCreate | TUpdate, id?: Id) => Promise<void>;
    submitting: boolean;
    isEdit: boolean;
    maySubmit: boolean;
  }) => React.ReactNode;
  searchPlaceholder?: string;
  initialMode?: "grid" | "form";
  canCreate?: boolean;
  canEdit?: boolean | ((row: T | undefined) => boolean);
  canDelete?: boolean | ((row: T | undefined) => boolean);
  /** NOVO: ações de linha exibidas no botão “Ações”. Retorne vazio para ocultar o botão. */
  actionsForRow?: (row?: T) => RowAction<T>[];
};

export function GridForm<T, TCreate = any, TUpdate = any>({
  title,
  idOf,
  columns,
  fetchAll,
  createItem,
  updateItem,
  deleteItem,
  renderForm,
  searchPlaceholder = "Buscar...",
  initialMode = "grid",
  canCreate,
  canEdit,
  canDelete,
  actionsForRow,
}: GridFormProps<T, TCreate, TUpdate>) {
  const [mode, setMode] = useState<"grid" | "form">(initialMode);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<T | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmYes, setConfirmYes] = useState<() => void>(() => () => {});

  // menu Ações
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsWrapRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  // ====== RESOLUÇÃO DOS GATES ======
  const _canCreate = canCreate ?? true;
  const _canEdit   = (row?: T) =>
    typeof canEdit === "function" ? canEdit(row) : (canEdit ?? true);
  const _canDelete = (row?: T) =>
    typeof canDelete === "function" ? canDelete(row) : (canDelete ?? true);

  // Evita race condition em buscas rápidas
  const abortRef = useRef<AbortController | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      const data = await fetchAll({ search });
      if (!ctl.signal.aborted) setRows(data);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [fetchAll, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // mantém seleção válida ao filtrar
  useEffect(() => {
    if (selected) {
      const id = idOf(selected);
      if (!filtered.some((r) => idOf(r) === id)) setSelected(filtered[0]);
    }
  }, [filtered, selected, idOf]);

  function toggleMode() {
    const mayToggle = _canCreate || (selected ? _canEdit(selected) : false);
    if (!mayToggle) return;
    setMode((m) => (m === "grid" ? "form" : "grid"));
  }

  function openCreate() {
    if (!_canCreate) return;
    setSelected(undefined);
    setMode("form");
  }
  function openEdit(row: T) {
    if (!_canEdit(row)) return;
    setSelected(row);
    setMode("form");
  }
  function cancelForm() {
    setSelected(undefined);
    setMode("grid");
  }

  async function submitForm(payload: any, id?: Id) {
    try {
      setSubmitting(true);
      setError(null);
      if (id !== undefined && id !== null) {
        if (!_canEdit(selected)) throw new Error("Sem permissão para editar.");
        await updateItem(id, payload as TUpdate);
      } else {
        if (!_canCreate) throw new Error("Sem permissão para incluir.");
        await createItem(payload as TCreate);
      }
      await load();
      setMode("grid");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDeleteRow(row: T) {
    if (!_canDelete(row)) return;
    const id = idOf(row);
    setConfirmMsg(`Excluir registro ${String(id)}? Esta ação não poderá ser desfeita.`);
    setConfirmYes(() => async () => {
      try {
        setError(null);
        await deleteItem(id);
        await load();
        setConfirmOpen(false);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  }

  function moveSelection(step: number) {
    if (!selected || filtered.length === 0) return;
    const idx = filtered.findIndex((r) => idOf(r) === idOf(selected));
    const nextIdx = Math.min(Math.max(idx + step, 0), filtered.length - 1);
    const next = filtered[nextIdx];
    if (next && idOf(next) !== idOf(selected)) {
      setSelected(next);
      const el = document.getElementById(`row-${String(idOf(next))}`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }

  const mayToggleButton = _canCreate || (selected ? _canEdit(selected) : false);

  // === Ações (menu) ===
  const actions = useMemo(
    () => (actionsForRow ? actionsForRow(selected) : []),
    [actionsForRow, selected]
  );

  // fecha menu ao clicar fora
  useEffect(() => {
    if (!actionsOpen) return;
    const onDocClick = (ev: MouseEvent) => {
      const el = ev.target as Node;
      if (
        actionsMenuRef.current?.contains(el) ||
        actionsWrapRef.current?.contains(el)
      ) return;
      setActionsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [actionsOpen]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
      </header>

      {error && (
        <div className="rounded-xl border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {mode === "grid" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar"
            />
            <div className="text-sm text-neutral-400">
              {loading ? "Carregando..." : `${filtered.length} registro(s)`}
            </div>
          </div>

          {/* toolbar */}
          <div className="relative flex justify-between" ref={actionsWrapRef}>
            <div className="flex gap-2">
              {mayToggleButton && (
                <IconButton onClick={toggleMode} title={mode === "grid" ? "Ir para formulário" : "Ir para grade"}>
                  {mode === "grid" ? <EditNoteIcon/> : <TableRowsIcon/>}
                </IconButton>
              )}

              <IconButton onClick={openCreate} title="Incluir" variant="green" disabled={!_canCreate}>
                <AddIcon/>
              </IconButton>

              <IconButton
                onClick={() => selected && confirmDeleteRow(selected)}
                disabled={!selected || !_canDelete(selected)}
                title="Excluir"
                variant="danger"
              >
                <DeleteIcon/>
              </IconButton>

              <IconButton onClick={() => moveSelection(-1)} disabled={!selected || filtered.length <= 1} title="Anterior">
                <ChevronLeftIcon/>
              </IconButton>
              <IconButton onClick={() => moveSelection(1)} disabled={!selected || filtered.length <= 1} title="Próximo">
                <ChevronRightIcon/>
              </IconButton>
            </div>

            {/* ===== Botão AÇÕES + dropdown ===== */}
            <IconButton
              onClick={() => setActionsOpen((v) => !v)}
              variant="primary"
              title="Ações"
              disabled={
                actions.length === 0 ||
                (!selected && actions.every((action) => !action.allowWithoutSelection))
              }
            >
              <BoltIcon />
            </IconButton>

            {actionsOpen && (
              <div
                ref={actionsMenuRef}
                className="absolute z-50 right-0 top-full mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
              >
                {actions.map((a) => (
                  <button
                    key={a.key}
                    className={[
                      "w-full text-left px-3 py-2 text-sm cursor-pointer",
                      a.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-800"
                    ].join(" ")}
                    onClick={async () => {
                      if ((!selected && !a.allowWithoutSelection) || a.disabled) return;
                      await a.onClick(selected as T);
                      setActionsOpen(false);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState action={<IconButton onClick={openCreate} variant="primary" disabled={!_canCreate}>Novo</IconButton>} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="min-w-full text-sm ">
                <thead className="bg-neutral-900 text-left text-neutral-200 ">
                  <tr>
                    {columns.map((c) => (
                      <th key={String(c.key)} className="p-3 resize-x overflow-hidden" style={{ width: c.width }}>{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const id = idOf(row);
                    const isSelected = selected ? idOf(selected) === id : false;
                    return (
                      <tr
                        id={`row-${String(id)}`}
                        key={String(id)}
                        className={[
                          "border-t border-neutral-800 cursor-pointer",
                          "hover:bg-neutral-700/50",
                          isSelected ? "bg-neutral-600 ring-1 ring-blue-600" : "",
                        ].join(" ")}
                        onClick={() => setSelected(row)}
                        onDoubleClick={() => (_canEdit(row) ? openEdit(row) : undefined)}
                      >
                        {columns.map((c) => (
                          <td key={String(c.key)} className="p-3 align-middle">
                            {c.render ? c.render(row, idx) : (row as any)[c.key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {mode === "form" && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {selected ? `Editar: ${String(idOf(selected))}` : "Novo registro"}
          </h2>
          {renderForm({
            initial: selected,
            onCancel: cancelForm,
            onSubmit: submitForm,
            submitting,
            isEdit: Boolean(selected),
            maySubmit: selected ? _canEdit(selected) : _canCreate,
          })}
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar exclusão"
        message={confirmMsg}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmYes}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
