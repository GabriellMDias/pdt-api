/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { fieldControlBaseClass } from "../../../../components/inputs/styles";
import type { ParameterType } from "../types/parameters";

export type EditorProps = {
  type: ParameterType;
  value: any;
  disabled?: boolean;
  onChange: (v: any) => void;
};

function coerceBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0" || s === "") return false;
  }
  return !!v;
}

export function ValueEditor({ type, value, disabled, onChange }: EditorProps) {
  if (type === "BOOL") {
    const checked = coerceBool(value);
    return (
      <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
        <input
          type="checkbox"
          className="h-4 w-4 accent-pilar-green"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span>{checked ? "Ativo" : "Inativo"}</span>
      </label>
    );
  }

  if (type === "INT") {
    return (
      <input
        type="number"
        className={fieldControlBaseClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      />
    );
  }

  if (type === "JSON") {
    const [text, setText] = useState(value == null ? "" : JSON.stringify(value, null, 2));

    useEffect(() => {
      setText(value == null ? "" : JSON.stringify(value, null, 2));
    }, [value]);

    return (
      <textarea
        rows={6}
        className={`${fieldControlBaseClass} min-h-[120px] font-mono text-xs`}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          try {
            const parsed = JSON.parse(raw);
            onChange(parsed);
          } catch {
            // Keeps partial/incomplete JSON while typing.
          }
        }}
        placeholder={'{\n  "key": "value"\n}'}
        disabled={disabled}
      />
    );
  }

  return (
    <input
      type="text"
      className={fieldControlBaseClass}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      disabled={disabled}
    />
  );
}
