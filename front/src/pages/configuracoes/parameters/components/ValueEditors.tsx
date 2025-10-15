/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import type { ParameterType } from '../types/parameters';

export type EditorProps = {
  type: ParameterType;
  value: any;
  disabled?: boolean;
  onChange: (v: any) => void;
};

function coerceBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0' || s === '') return false;
  }
  return !!v;
}

export function ValueEditor({ type, value, disabled, onChange }: EditorProps) {
  if (type === 'BOOL') {
    const checked = coerceBool(value);
    return (
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="text-sm">{checked ? 'Ativo' : 'Inativo'}</span>
      </label>
    );
  }

  if (type === 'INT') {
    return (
      <input
        type="number"
        className="w-full rounded-md border px-2 py-1 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        disabled={disabled}
      />
    );
  }

  if (type === 'JSON') {
    return (
      <textarea
        rows={6}
        className="w-full rounded-md border px-2 py-1 text-sm font-mono"
        value={value == null ? '' : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === '') return onChange(null);
          try { onChange(JSON.parse(raw)); } catch { /* mantém último válido */ }
        }}
        placeholder={'{\n  "key": "value"\n}'}
        disabled={disabled}
      />
    );
  }

  // STRING (default)
  return (
    <input
      type="text"
      className="w-full rounded-md border px-2 py-1 text-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled}
    />
  );
}