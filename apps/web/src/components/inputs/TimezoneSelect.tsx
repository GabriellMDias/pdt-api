/* src/components/inputs/TimezoneSelect.tsx */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DefaultInput from "./DefaultInput";
import {
  fieldControlInteractiveClass,
  fieldHintClass,
  fieldLabelClass,
  fieldMenuSurfaceClass,
} from "./styles";

type ControlledSelectProps = Pick<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "name" | "id" | "required" | "value" | "onChange" | "onBlur" | "tabIndex" | "autoFocus" | "form"
>;

type Props = ControlledSelectProps & {
  label?: string;
  preferred?: string[];
  showOffset?: boolean;
  includeUTC?: boolean;
  searchable?: boolean;
  hint?: string;
  className?: string;
  disabled?: boolean;
};

const FALLBACK_TIMEZONES = [
  "UTC","Etc/GMT","Europe/London","Europe/Berlin","Europe/Paris",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "America/Sao_Paulo","America/Bogota","America/Mexico_City","America/Argentina/Buenos_Aires",
  "Africa/Johannesburg","Asia/Tokyo","Asia/Shanghai","Asia/Singapore","Asia/Dubai",
  "Australia/Sydney","Pacific/Auckland",
];

function getAllTimeZones(includeUTC: boolean): string[] {
  const list: string[] = typeof Intl?.supportedValuesOf === "function"
    ? (Intl.supportedValuesOf("timeZone") as string[])
    : FALLBACK_TIMEZONES;
  const arr = includeUTC && !list.includes("UTC") ? ["UTC", ...list] : list.slice();
  return Array.from(new Set(arr));
}

function formatTzLabel(tz: string) {
  return tz.replaceAll("_", " ");
}

function offsetFor(tz: string, d = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(d);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "";
    if (/GMT|UTC/.test(tzName)) return tzName.replace("UTC", "GMT");
    return tzName ? `GMT${tzName.replace(/^[A-Z]+/, "")}` : "";
  } catch { return ""; }
}

function numericOffsetMinutes(tz: string, d = new Date()): number {
  const s = offsetFor(tz, d);
  const m = s.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2] || "0");
  const mm = Number(m[3] || "0");
  return sign * (hh * 60 + mm);
}

export default function TimezoneSelect({
  label = "Time zone",
  preferred = ["America/Sao_Paulo", "UTC"],
  showOffset = true,
  includeUTC = true,
  searchable = true,
  hint,
  value,
  onChange,
  className = "",
  disabled,
  name,
  id,
  tabIndex,
  autoFocus,
}: Props) {
  const allTzs = useMemo(() => getAllTimeZones(includeUTC), [includeUTC]);

  const offsetMap = useMemo(() => {
    const now = new Date();
    return new Map(
      allTzs.map((tz) => {
        const off = offsetFor(tz, now);
        return [
          tz,
          {
            label: `${formatTzLabel(tz)}${showOffset && off ? ` — ${off}` : ""}`,
            minutes: numericOffsetMinutes(tz, now),
          },
        ] as const;
      })
    );
  }, [allTzs, showOffset]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!value) return;
    if (!allTzs.includes(String(value))) {
      allTzs.unshift(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const preferredSet = useMemo(() => new Set(preferred), [preferred]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = allTzs;

    if (q) items = items.filter((tz) => tz.toLowerCase().includes(q));

    items = [...items].sort((a, b) => {
      const ma = offsetMap.get(a)?.minutes ?? 0;
      const mb = offsetMap.get(b)?.minutes ?? 0;
      if (ma !== mb) return ma - mb;
      return formatTzLabel(a).localeCompare(formatTzLabel(b), "en");
    });

    const pref = items.filter((tz) => preferredSet.has(tz));
    const rest = items.filter((tz) => !preferredSet.has(tz));
    return { pref, rest, flat: [...pref, ...rest] };
  }, [allTzs, offsetMap, preferredSet, query]);

  useEffect(() => { setActiveIdx(0); }, [query, open]);

  const emitChange = useCallback((next: string) => {
    if (!onChange) return;
    const ev = { target: { value: next } } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(ev);
  }, [onChange]);

  const selectValue = useCallback((tz: string) => {
    emitChange(tz);
    setOpen(false);
    setQuery("");
  }, [emitChange]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!list.flat.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, list.flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const tz = list.flat[activeIdx];
        if (tz) selectValue(tz);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.flat, activeIdx, selectValue]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-idx="${activeIdx}"]`);
    if (el) {
      const parent = listRef.current;
      const { top, bottom } = el.getBoundingClientRect();
      const pTop = parent.getBoundingClientRect().top;
      const pBottom = parent.getBoundingClientRect().bottom;
      if (top < pTop) parent.scrollTop -= pTop - top;
      else if (bottom > pBottom) parent.scrollTop += bottom - pBottom;
    }
  }, [open, activeIdx]);

  const currentLabel =
    value && offsetMap.get(String(value))?.label
      ? offsetMap.get(String(value))!.label
      : value
      ? formatTzLabel(String(value))
      : "Selecione...";

  return (
    <div className={`w-full ${className}`} ref={wrapRef}>
      {label && (
        <label className={fieldLabelClass} htmlFor={id}>
          {label}
        </label>
      )}

      {/* Campo oculto para submissão em forms */}
      {name && <input type="hidden" name={name} value={String(value ?? "")} />}

      <button
        id={id}
        type="button"
        disabled={disabled}
        tabIndex={tabIndex}
        autoFocus={autoFocus}
        onClick={() => setOpen((v) => !v)}
        className={`
          ${fieldControlInteractiveClass}
          h-10 text-left
          flex items-center justify-between
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${!value ? "text-neutral-500 dark:text-neutral-400" : ""}`}>
          {currentLabel}
        </span>
        <span className="ml-2 text-neutral-500 dark:text-neutral-400">{"\u25BE"}</span>
      </button>

      {open && (
        <div
          className={`
            ${fieldMenuSurfaceClass}
            mt-2
            p-2
          `}
        >
          {searchable && (
            <DefaultInput
              autoFocus
              placeholder="Buscar (ex.: São Paulo, Tokyo, Pacific/Auckland...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 text-sm mb-2"
            />
          )}

          <div ref={listRef} className="max-h-72 overflow-auto rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
            {list.pref.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Preferidos
                </div>
                {list.pref.map((tz, idx) => {
                  const i = idx;
                  const globalIdx = i;
                  const label = offsetMap.get(tz)?.label ?? formatTzLabel(tz);
                  const active = activeIdx === globalIdx;
                  const selected = String(value) === tz;
                  return (
                    <OptionRow
                      key={tz}
                      idx={globalIdx}
                      active={active}
                      selected={selected}
                      label={label}
                      onClick={() => selectValue(tz)}
                    />
                  );
                })}
              </div>
            )}

            <div>
              {list.pref.length > 0 && list.rest.length > 0 && (
                <div className="px-2 py-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Outros
                </div>
              )}
              {list.rest.map((tz, idx) => {
                const globalIdx = list.pref.length + idx;
                const label = offsetMap.get(tz)?.label ?? formatTzLabel(tz);
                const active = activeIdx === globalIdx;
                const selected = String(value) === tz;
                return (
                  <OptionRow
                    key={tz}
                    idx={globalIdx}
                    active={active}
                    selected={selected}
                    label={label}
                    onClick={() => selectValue(tz)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hint && <span className={fieldHintClass}>{hint}</span>}
    </div>
  );
}

function OptionRow({
  idx,
  active,
  selected,
  label,
  onClick,
}: {
  idx: number;
  active: boolean;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-idx={idx}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-100
        ${active ? "bg-neutral-100 dark:bg-neutral-800" : ""}
        ${selected ? "text-pilar-orange" : ""}
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        focus:outline-none
      `}
      role="option"
      aria-selected={selected}
    >
      {label}
    </button>
  );
}
