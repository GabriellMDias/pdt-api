import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export type YearMonth = string; // "YYYY-MM"

type Props = {
  /** Valor controlado em "YYYY-MM" */
  value: YearMonth;
  /** Dispara com o próximo valor (YYYY-MM) */
  onChange: (next: YearMonth) => void;

  label?: string;

  className?: string;
  inputClassName?: string;

  required?: boolean;
  disabled?: boolean;
  /** Limites em "YYYY-MM" (ex.: "2024-01") */
  min?: YearMonth;
  max?: YearMonth;

  /** Dispara quando o usuário pressiona Enter no input. */
  onEnter?: () => void;

  /** ---- URL Sync (opcional) ---- */
  syncUrl?: boolean;
  /** Nome do parâmetro na URL (ex.: ?month=2025-11) */
  key?: string;
  /** Chaves legadas aceitas na leitura inicial (removidas na normalização) */
  legacyKeys?: string[];
  /** Se true, usa history.replace ao escrever na URL (default: true) */
  replaceHistory?: boolean;
};

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function MonthYear({
  value,
  onChange,
  label = "Mês",

  className,
  inputClassName = "w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-pilar-default-bg-dark p-2 outline-none focus:ring-2 focus:ring-pilar-green",

  required,
  disabled,
  min,
  max,

  onEnter,

  syncUrl = true,
  key: urlKey = "month",
  legacyKeys = ["competencia", "mes"],
  replaceHistory = true,
}: Props) {
  const [sp, setSearchParams] = useSearchParams();

  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef<string>("");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onEnter && e.key === "Enter") onEnter();
    },
    [onEnter]
  );

  const update = useCallback(
    (next: YearMonth) => {
      onChange(next);
    },
    [onChange]
  );

  // ---------- LEITURA INICIAL DA URL (uma vez) ----------
  useEffect(() => {
    if (!syncUrl) return;
    if (didInitFromUrl.current) return;

    const readFrom = (key: string, legacy: string[]) =>
      sp.get(key) ||
      legacy.map((k) => sp.get(k) || "").find((v) => !!v) ||
      "";

    const raw = readFrom(urlKey, legacyKeys);
    const ym = YM_RE.test(raw) ? raw : "";

    if (ym) {
      update(ym);
      // normaliza: fixa urlKey e remove legadas
      const qs = new URLSearchParams(sp);
      qs.set(urlKey, ym);
      for (const k of legacyKeys) qs.delete(k);
      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = ym;
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, urlKey, legacyKeys]);

  // ---------- ESCRITA NA URL quando a prop value mudar ----------
  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return;

    const cur = value || "";
    const inUrl = sp.get(urlKey) || "";

    if (cur === inUrl || cur === lastUrlValueRef.current) return;

    const qs = new URLSearchParams(sp);
    if (cur && YM_RE.test(cur)) qs.set(urlKey, cur);
    else qs.delete(urlKey);
    for (const k of legacyKeys) qs.delete(k);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sp, syncUrl, urlKey, replaceHistory, legacyKeys]);

  return (
    <div className={className}>
      <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
        {label}
      </label>
      <input
        type="month"
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
      />
    </div>
  );
}
