import type { InputHTMLAttributes, ReactNode } from 'react'
import { fieldControlBaseClass, fieldLabelClass } from './styles'

type DefaultInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export default function DefaultInput({
  label,
  iconLeft,
  iconRight,
  className = '',
  ...rest
}: DefaultInputProps) {
  return (
    <div>
      {label && <label className={fieldLabelClass}>{label}</label>}
      <div className="relative">
        {iconLeft && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
            {iconLeft}
          </span>
        )}
        <input
          className={`
            ${fieldControlBaseClass}
            ${iconLeft ? 'pl-10' : ''} ${iconRight ? 'pr-10' : ''} ${className}
          `}
          {...rest}
        />
        {iconRight && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
            {iconRight}
          </span>
        )}
      </div>
    </div>
  )
}
