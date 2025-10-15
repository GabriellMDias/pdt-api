import React from 'react';

type Props = { children: React.ReactNode; title?: string } & React.HTMLAttributes<HTMLSpanElement>;

export default function Tag({ children, title, className = '', ...rest }: Props) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}