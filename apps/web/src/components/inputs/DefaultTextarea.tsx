import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export default function DefaultTextarea({
  label,
  hint,
  className = "",
  ...rest
}: Props) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm text-neutral-300">{label}</span>
      )}
      <textarea
        className={`
          w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3
          text-sm outline-none focus:ring-2 focus:ring-pilar-green
          ${className}
        `}
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
