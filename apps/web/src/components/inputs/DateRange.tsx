/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

type DateYMD = string; // "YYYY-MM-DD"

type Props = {
  start: DateYMD;
  end: DateYMD;
  onChange: (next: { start: DateYMD; end: DateYMD }) => void;

  startLabel?: string;
  endLabel?: string;

  /** Se true, quando start > end o componente inverte automaticamente. */
  autoOrder?: boolean;

  className?: string;
  inputClassName?: string;

  required?: boolean;
  disabled?: boolean;
  min?: DateYMD;
  max?: DateYMD;

  /** Dispara quando o usuário pressiona Enter em qualquer input. */
  onEnter?: () => void;

  /** ---- URL Sync (opcional) ---- */
  syncUrl?: boolean;
  startKey?: string;
  endKey?: string;
  startLegacyKeys?: string[];
  endLegacyKeys?: string[];
  replaceHistory?: boolean;
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DateRange({
  start,
  end,
  onChange,
  startLabel = "Data inicial",
  endLabel = "Data final",
  autoOrder = false,
  className,
  inputClassName = "w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-pilar-default-bg-dark p-2 outline-none focus:ring-2 focus:ring-pilar-green",
  required,
  disabled,
  min,
  max,
  onEnter,
  syncUrl = true,
  startKey = "initialDate",
  endKey = "finalDate",
  startLegacyKeys = ["dataInicial", "start"],
  endLegacyKeys = ["dataFinal", "end"],
  replaceHistory = true,
}: Props) {
  const [sp, setSearchParams] = useSearchParams();

  const didInitFromUrl = useRef(false);
  const lastUrlPairRef = useRef<string>(""); // "start|end"

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onEnter && e.key === "Enter") onEnter();
    },
    [onEnter]
  );

  const applyOrderAndChange = useCallback(
    (nextStart: DateYMD, nextEnd: DateYMD) => {
      let s = nextStart;
      let e = nextEnd;
      // só reordena quando AMBAS as datas estão completas (YYYY-MM-DD)
      const isFull = (v: string) => YMD_RE.test(v);
      if (autoOrder && isFull(s) && isFull(e) && s > e) [s, e] = [e, s];
      onChange({ start: s, end: e });
    },
    [onChange, autoOrder]
  );

  const update = useCallback(
    (which: "start" | "end", value: DateYMD) => {

      const nextStart = which === "start" ? value : start;
      const nextEnd = which === "end" ? value : end;
      applyOrderAndChange(nextStart, nextEnd);
    },
    [start, end, applyOrderAndChange]
  );

  // ---------- LEITURA INICIAL DA URL (uma vez) ----------
  useEffect(() => {
    if (!syncUrl) return;
    if (didInitFromUrl.current) return;

    const readFrom = (key: string, legacy: string[]) =>
      sp.get(key) ||
      legacy.map((k) => sp.get(k) || "").find((v) => !!v) ||
      "";

    const rawStart = readFrom(startKey, startLegacyKeys);
    const rawEnd = readFrom(endKey, endLegacyKeys);

    const s = YMD_RE.test(rawStart) ? rawStart : "";
    const e = YMD_RE.test(rawEnd) ? rawEnd : "";

    if (s || e) {
      applyOrderAndChange(s || "", e || "");

      const qs = new URLSearchParams(sp);
      s ? qs.set(startKey, s) : qs.delete(startKey);
      e ? qs.set(endKey, e) : qs.delete(endKey);
      for (const k of startLegacyKeys) qs.delete(k);
      for (const k of endLegacyKeys) qs.delete(k);
      setSearchParams(qs, { replace: true });
      lastUrlPairRef.current = `${s}|${e}`;
    }

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, sp, startKey, endKey, startLegacyKeys, endLegacyKeys]);

  // ---------- ESCRITA NA URL quando as props mudarem ----------
  useEffect(() => {
    if (!syncUrl) return;
    if (!didInitFromUrl.current) return;

    const curPair = `${start || ""}|${end || ""}`;
    const inUrl = `${sp.get(startKey) || ""}|${sp.get(endKey) || ""}`;

    console.log(inUrl)

    if (curPair === inUrl || curPair === lastUrlPairRef.current) return;

    const qs = new URLSearchParams(sp);
    start ? qs.set(startKey, start) : qs.delete(startKey);
    end ? qs.set(endKey, end) : qs.delete(endKey);
    for (const k of startLegacyKeys) qs.delete(k);
    for (const k of endLegacyKeys) qs.delete(k);

    setSearchParams(qs, { replace: replaceHistory });
    lastUrlPairRef.current = curPair;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, sp, syncUrl, startKey, endKey, replaceHistory, startLegacyKeys, endLegacyKeys]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
            {startLabel}
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => update("start", e.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClassName}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
            {endLabel}
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => update("end", e.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClassName}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
          />
        </div>
      </div>
    </div>
  );
}
