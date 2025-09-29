import type { SelectHTMLAttributes, ReactNode } from "react";

type Option = { value: string | number; label: ReactNode; disabled?: boolean };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Option[];
  hint?: string;
};

export default function DefaultSelect({
  label,
  options,
  className = "",
  hint,
  ...rest
}: Props) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm
          dark:bg-neutral-900 dark:border-neutral-700
          focus:outline-none focus:ring-2 focus:ring-pilar-green cursor-pointer
          ${className}
        `}
        {...rest}
      >
        {options.map((o, i) => (
          <option key={i} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
