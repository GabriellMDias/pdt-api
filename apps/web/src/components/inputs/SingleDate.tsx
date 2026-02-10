import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fieldControlBaseClass, fieldLabelClass } from "./styles";

export type DateYMD = string; // "YYYY-MM-DD"

type Props = {
  /** Valor controlado em "YYYY-MM-DD" */
  value: DateYMD;
  /** Dispara com o próximo valor (YYYY-MM-DD) */
  onChange: (next: DateYMD) => void;

  label?: string;

  className?: string;
  inputClassName?: string;

  required?: boolean;
  disabled?: boolean;
  min?: DateYMD;
  max?: DateYMD;

  /** Dispara quando o usuário pressiona Enter no input. */
  onEnter?: () => void;

  /** ---- URL Sync (opcional) ---- */
  syncUrl?: boolean;
  /** Nome do parâmetro na URL (ex.: ?date=2025-10-01) */
  key?: string;
  /** Chaves legadas aceitas na leitura inicial (todas removidas na normalização) */
  legacyKeys?: string[];
  /** Se true, usa history.replace ao escrever na URL (default: true) */
  replaceHistory?: boolean;
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SingleDate({
  value,
  onChange,
  label = "Data",

  className,
  inputClassName = fieldControlBaseClass,

  required,
  disabled,
  min,
  max,

  onEnter,

  syncUrl = true,
  key: urlKey = "date",
  legacyKeys = ["data", "dt", "dia"],
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
    (next: DateYMD) => {
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
    const d = YMD_RE.test(raw) ? raw : "";

    if (d) {
      // aplica ao estado externo
      update(d);

      // normaliza a URL: fixa urlKey e remove legadas
      const qs = new URLSearchParams(sp);
      qs.set(urlKey, d);
      for (const k of legacyKeys) qs.delete(k);
      setSearchParams(qs, { replace: true });
      lastUrlValueRef.current = d;
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
    if (cur && YMD_RE.test(cur)) qs.set(urlKey, cur);
    else qs.delete(urlKey);
    for (const k of legacyKeys) qs.delete(k);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sp, syncUrl, urlKey, replaceHistory, legacyKeys]);

  return (
    <div className={className}>
      <label className={fieldLabelClass}>
        {label}
      </label>
      <input
        type="date"
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
