// src/components/Sidebar/SidebarButton.tsx
import { type ReactNode } from 'react';
import clsx from 'clsx';

interface SidebarButtonProps {
  icon: ReactNode;
  label: string;
  isOpen: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
  expandable?: boolean;
}

export default function SidebarButton({
  icon,
  label,
  isOpen,
  onClick,
  title,
  className = '',
  style,
  active = false,
  expandable = false,
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      style={style}
      className={clsx(
        'group relative w-full select-none',
        'flex items-center gap-3 text-white/90 hover:text-white',
        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pilar-orange',
        'p-2 pl-4 rounded-md transition-colors duration-200 cursor-pointer',
        active && 'bg-white/15 text-pilar-orange font-medium',
        className
      )}
      aria-label={label}
      aria-expanded={expandable ? active : undefined}
    >
      <div className="min-w-[20px] grid place-items-center">{icon}</div>
      {isOpen && <span className="text-sm">{label}</span>}
      {/* Acento lateral */}
      <span
        className={clsx(
          'absolute left-0 top-0 h-full w-1 rounded-r transition-all duration-300',
          active ? 'bg-pilar-orange opacity-100' : 'bg-pilar-orange opacity-0 group-hover:opacity-100'
        )}
      />
    </button>
  );
}
