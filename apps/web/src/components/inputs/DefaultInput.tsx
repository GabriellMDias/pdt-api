import type { InputHTMLAttributes, ReactNode } from 'react'

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
      {label && <label className="block mb-1">{label}</label>}
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-inherit">
            {iconLeft}
          </span>
        )}
        <input
          className={`
            w-full px-4 py-2 rounded-md bg-white/30 text-inherit
            focus:outline-none focus:ring-2 focus:ring-pilar-green
            ${iconLeft ? 'pl-10' : ''} ${iconRight ? 'pr-10' : ''} ${className}
          `}
          {...rest}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-inherit">
            {iconRight}
          </span>
        )}
      </div>
    </div>
  )
}
