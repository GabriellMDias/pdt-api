import type { InputHTMLAttributes } from "react";
import { fieldHintClass } from "./styles";

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
        className="h-4 w-4 rounded border-neutral-400 bg-white text-pilar-green accent-pilar-green focus:ring-pilar-green dark:border-neutral-600 dark:bg-pilar-default-bg-dark"
        {...rest}
      />
      {label && <span className="text-sm text-neutral-800 dark:text-neutral-200">{label}</span>}
      {hint && <span className={fieldHintClass}>{hint}</span>}
    </label>
  );
}
