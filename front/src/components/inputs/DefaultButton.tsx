import type { ButtonHTMLAttributes, ReactNode } from 'react'

type DefaultButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export default function DefaultButton({
  children,
  className = '',
  variant = 'primary',
  iconLeft,
  iconRight,
  ...rest
}: DefaultButtonProps) {
  const baseStyle = `
    w-full py-2 px-4 rounded-md font-semibold
    flex items-center justify-center gap-2
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-pilar-orange
    transform active:scale-95
    hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
    cursor-pointer
  `

  const variants = {
    primary: 'bg-pilar-orange text-white hover:bg-opacity-90',
    secondary: 'bg-white text-pilar-green hover:bg-gray-200',
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...rest}
    >
      {iconLeft && <span className="mr-1">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="ml-1">{iconRight}</span>}
    </button>
  )
}
