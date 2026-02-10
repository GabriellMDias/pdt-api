import type { TextareaHTMLAttributes } from "react";
import { fieldControlBaseClass, fieldHintClass, fieldLabelClass } from "./styles";

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
        <span className={fieldLabelClass}>{label}</span>
      )}
      <textarea
        className={`
          ${fieldControlBaseClass} p-3
          ${className}
        `}
        {...rest}
      />
      {hint && <span className={fieldHintClass}>{hint}</span>}
    </label>
  );
}
