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
}

export default function SidebarButton({
  icon,
  label,
  isOpen,
  onClick,
  title,
  className = '',
  style
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      style={style}
      className={clsx(
        'group flex items-center gap-3 text-white hover:bg-white/10 p-2 pl-4 rounded-md cursor-pointer transition-colors duration-200 relative',
        className
      )}
    >
      <div className="min-w-[20px]">{icon}</div>
      {isOpen && <span className="text-sm group-hover:text-orange-300">{label}</span>}
      <span className="absolute left-0 h-full w-1 bg-orange-400 opacity-0 group-hover:opacity-100 rounded-r transition-all duration-300" />
    </button>
  );
}
