import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  hint?: string;
};

export default function DefaultCheckbox({
  label,
  hint,
  className = "",
  ...rest
}: Props) {
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-pilar-green focus:ring-pilar-green accent-pilar-green "
        {...rest}
      />
      {label && <span className="text-sm text-neutral-200">{label}</span>}
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
