/* DefaultSelect.tsx (retrocompatível) */
import { useEffect, useMemo, useRef, useCallback } from "react";
import type { SelectHTMLAttributes, ReactNode, ChangeEventHandler } from "react";
import { useSearchParams } from "react-router-dom";

type Option = { value: string | number; label: ReactNode; disabled?: boolean };
type Value = string | number | "";

// Props nativos do <select>, mas controlamos value/onChange aqui
type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  /** onChange nativo (modo legado). Continua suportado. */
  onChange?: ChangeEventHandler<HTMLSelectElement>;
};

type BaseProps = NativeSelectProps & {
  label?: string;
  options: Option[];
  hint?: string;

  /** Valor controlado do select. */
  value: Value;

  /** Novo handler tipado. Agora é OPCIONAL (retrocompat). */
  onChangeValue?: (value: Value) => void;

  /** ---- URL Sync (opcional) ---- */
  syncUrl?: boolean;
  paramKey?: string;
  legacyKeys?: string[];
  replaceHistory?: boolean;

  /**
   * Se true, quando a option original for number, o valor emitido será number;
   * caso contrário string. Se suas options já usam number, detectamos sozinhos.
   */
  coerceNumber?: boolean;
};

export default function DefaultSelect({
  label,
  options,
  className = "",
  hint,
  value,
  onChangeValue,

  // URL sync
  syncUrl = true,
  paramKey = "select",
  legacyKeys = ["opt", "value"],
  replaceHistory = true,
  coerceNumber,

  // onChange nativo (modo legado)
  onChange: nativeOnChange,
  ...rest
}: BaseProps) {
  const [sp, setSearchParams] = useSearchParams();

  const didInitFromUrl = useRef(false);
  const lastUrlValueRef = useRef<string>("");

  // Se não temos onChangeValue, desabilitamos efetivamente a sync de URL
  // para não tentar dirigir o estado do pai em telas legadas.
  const effectiveSync = !!onChangeValue && !!syncUrl;

  const optionByStringValue = useMemo(() => {
    const map = new Map<string, Option>();
    for (const o of options) map.set(String(o.value), o);
    return map;
  }, [options]);

  const toEmittedType = useCallback(
    (raw: string): Value => {
      const opt = optionByStringValue.get(raw);
      const orig = opt?.value;
      const shouldNumber = typeof orig === "number" || coerceNumber === true;

      if (shouldNumber) {
        const asNum = Number(raw);
        return Number.isNaN(asNum) ? raw : asNum;
      }
      return raw;
    },
    [optionByStringValue, coerceNumber]
  );

  // ---------- LEITURA INICIAL DA URL (uma vez) ----------
  useEffect(() => {
    if (!effectiveSync) return;
    if (didInitFromUrl.current) return;

    const readFrom = (key: string, legacy: string[]) =>
      sp.get(key) || legacy.map((k) => sp.get(k) || "").find((v) => !!v) || "";

    const raw = readFrom(paramKey, legacyKeys);

    if (raw) {
      if (optionByStringValue.has(raw)) {
        // só aplicamos no pai se temos onChangeValue
        onChangeValue?.(toEmittedType(raw));

        // Normaliza URL: fixa paramKey e remove legados
        const qs = new URLSearchParams(sp);
        qs.set(paramKey, raw);
        for (const k of legacyKeys) qs.delete(k);
        setSearchParams(qs, { replace: true });
        lastUrlValueRef.current = raw;
      } else {
        // valor inválido na URL: remove
        const qs = new URLSearchParams(sp);
        qs.delete(paramKey);
        for (const k of legacyKeys) qs.delete(k);
        setSearchParams(qs, { replace: true });
        lastUrlValueRef.current = "";
      }
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSync, sp, paramKey, legacyKeys, optionByStringValue]);

  // ---------- ESCRITA NA URL quando a prop value mudar ----------
  useEffect(() => {
    if (!effectiveSync) return;
    if (!didInitFromUrl.current) return;

    const cur = value === undefined || value === null ? "" : String(value);
    const inUrl = sp.get(paramKey) || "";

    if (cur === inUrl || cur === lastUrlValueRef.current) return;

    const qs = new URLSearchParams(sp);
    if (cur && optionByStringValue.has(cur)) qs.set(paramKey, cur);
    else qs.delete(paramKey);

    for (const k of legacyKeys) qs.delete(k);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlValueRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sp, effectiveSync, paramKey, replaceHistory, legacyKeys, optionByStringValue]);

  // ---------- Handle change ----------
  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    // 1) chama o onChange nativo legado (se existir)
    nativeOnChange?.(e);

    // 2) chama a API nova tipada (se existir)
    const raw = e.target.value;
    onChangeValue?.(toEmittedType(raw));
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
          {label}
        </label>
      )}
      <select
        value={value === undefined || value === null ? "" : String(value)}
        onChange={handleChange}
        className={`
          w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
          dark:bg-pilar-default-bg-dark dark:border-neutral-700
          focus:outline-none focus:ring-2 focus:ring-pilar-green cursor-pointer
          ${className}
        `}
        {...rest}
      >
        {options.map((o, i) => (
          <option key={i} value={String(o.value)} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
