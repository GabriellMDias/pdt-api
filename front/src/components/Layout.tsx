import { type ReactNode, useState } from 'react';
import Sidebar from './Sidebar/Sidebar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'Página' }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative h-screen text-white bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark">
      {/* Sidebar sobreposto */}
      <Sidebar isOpen={isMenuOpen} toggleMenu={() => setIsMenuOpen((v) => !v)} />

      {/* Conteúdo da página */}
      <div
        className={`h-full w-full flex flex-col transition-all duration-300 pl-16`}
      >
        {/* Top bar */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black dark:text-white ml-2">{title}</h1>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 border-t border-t-pilar-green bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark overflow-auto p-2">
          {children}
        </div>
      </div>
    </div>
  );
}
