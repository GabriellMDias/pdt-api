import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
  fieldControlBaseClass,
  fieldMenuSurfaceClass,
} from "../inputs/styles";

export type ColumnMultiSelectFilterOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type ColumnMultiSelectFilterProps = {
  options: ColumnMultiSelectFilterOption[];
  selectedValues: Array<string | number>;
  onChange: (values: Array<string | number>) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  maxHeight?: number;
  menuWidth?: number;
  align?: "left" | "right";
  showSelectAll?: boolean;
};

export default function ColumnMultiSelectFilter({
  options,
  selectedValues,
  onChange,
  label,
  placeholder = "Todos",
  disabled = false,
  className,
  searchable,
  maxHeight = 240,
  menuWidth = 320,
  align = "left",
  showSelectAll = true,
}: ColumnMultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(
    () => new Set(selectedValues.map((value) => String(value))),
    [selectedValues],
  );
  const isSearchable = searchable ?? options.length > 8;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      normalizeText(option.label).includes(normalizedQuery),
    );
  }, [options, query]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(String(option.value))),
    [options, selectedSet],
  );

  const selectedLabels = selectedOptions.map((option) => option.label);
  const hasActiveFilter = selectedOptions.length > 0;
  const buttonLabel = getButtonLabel(selectedOptions, placeholder);
  const allEnabledValues = useMemo(
    () => options.filter((option) => !option.disabled).map((option) => String(option.value)),
    [options],
  );
  const allSelected =
    allEnabledValues.length > 0 &&
    allEnabledValues.every((value) => selectedSet.has(value));

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  function stopEvent(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function toggleValue(value: string | number) {
    const next = new Set(selectedSet);
    const key = String(value);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(Array.from(next));
  }

  function clearSelection() {
    onChange([]);
  }

  function toggleSelectAll() {
    onChange(allSelected ? [] : allEnabledValues);
  }

  return (
    <div
      ref={containerRef}
      className={clsx("relative min-w-0", className)}
      onClick={stopEvent}
    >
      <button
        type="button"
        className={clsx(
          "inline-flex h-7 w-full max-w-full items-center gap-1.5 rounded-lg border px-2 text-left text-[11px] font-medium shadow-sm transition-colors",
          hasActiveFilter
            ? "border-pilar-green bg-pilar-green/10 text-pilar-green dark:border-pilar-green/80 dark:bg-pilar-green/15"
            : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:bg-pilar-default-bg-dark dark:text-neutral-200 dark:hover:border-neutral-500",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        title={selectedLabels.length ? selectedLabels.join(", ") : label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `Filtrar ${label}` : "Filtrar coluna"}
      >
        <FilterListIcon
          sx={{ fontSize: 15 }}
          className={clsx("shrink-0", hasActiveFilter ? "opacity-100" : "opacity-70")}
        />
        <span
          className={clsx(
            "min-w-0 flex-1 truncate",
            !hasActiveFilter && "text-neutral-500 dark:text-neutral-400",
          )}
        >
          {buttonLabel}
        </span>
        {hasActiveFilter && (
          <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-pilar-green px-1 text-[10px] font-bold leading-none text-white">
            {selectedOptions.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={clsx(
            fieldMenuSurfaceClass,
            "absolute z-50 mt-2 overflow-hidden p-2",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{
            width: menuWidth,
            maxWidth: `min(${menuWidth}px, calc(100vw - 2rem))`,
          }}
          role="listbox"
          aria-multiselectable="true"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-2 dark:border-neutral-700">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200" title={label}>
                {label || "Filtro"}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {hasActiveFilter
                  ? `${selectedOptions.length} selecionada${selectedOptions.length === 1 ? "" : "s"}`
                  : "Nenhum filtro ativo"}
              </p>
            </div>
            <button
              type="button"
              className={clsx(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                hasActiveFilter
                  ? "text-pilar-green hover:bg-pilar-green/10"
                  : "cursor-not-allowed text-neutral-400",
              )}
              onClick={clearSelection}
              disabled={!hasActiveFilter}
              title="Limpar filtro"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
              Limpar
            </button>
          </div>

          {isSearchable && (
            <label className="relative mt-2 block">
              <SearchIcon
                sx={{ fontSize: 16 }}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar opção..."
                className={clsx(fieldControlBaseClass, "h-8 rounded-lg py-1 pl-8 pr-2 text-xs")}
              />
            </label>
          )}

          {showSelectAll && options.length > 1 && (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
              onClick={toggleSelectAll}
            >
              <span>{allSelected ? "Desmarcar todas" : "Selecionar todas"}</span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {options.length}
              </span>
            </button>
          )}

          <div
            className="mt-1 overflow-y-auto py-1"
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 && (
              <div className="rounded-lg px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                Sem opções
              </div>
            )}

            {filteredOptions.map((option) => {
              const checked = selectedSet.has(String(option.value));
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => toggleValue(option.value)}
                  role="option"
                  aria-selected={checked}
                  title={option.label}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-neutral-800 transition-colors dark:text-neutral-100",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-700/50",
                    checked && "bg-pilar-green/10 text-pilar-green dark:bg-pilar-green/15",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-pilar-green bg-pilar-green text-white"
                        : "border-neutral-400 bg-transparent",
                    )}
                  >
                    {checked && (
                      <svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          d="M5 10l3 3 7-7"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.4"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getButtonLabel(
  selectedOptions: ColumnMultiSelectFilterOption[],
  placeholder: string,
) {
  if (selectedOptions.length === 0) return placeholder;
  if (selectedOptions.length === 1) return selectedOptions[0].label;
  return `${selectedOptions.length} selecionadas`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
