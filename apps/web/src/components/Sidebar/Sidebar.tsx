// src/components/Sidebar/Sidebar.tsx
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeSwitch from '../ThemeSwitch';
import SidebarButton from './SidebarButton';
import SidebarItem from './SidebarItem';
import { protectedRoutes } from '../../routes/protectedRoutes';
import { filterRoutesByPermissions } from './filterRoutesByPermissions';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

export default function Sidebar({ isOpen, toggleMenu }: SidebarProps) {
  const { logout, permissions, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const asideRef = useRef<HTMLDivElement | null>(null);
  const appVersion = import.meta.env.VITE_APP_VERSION;

  const filteredRoutes = useMemo(() => {
    const perms = Array.isArray(permissions) ? permissions : [];
    return filterRoutesByPermissions(protectedRoutes, perms, userId);
  }, [permissions, userId]);

  // Fecha no mobile quando navegar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && isOpen) {
      toggleMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Fechar ao clicar fora do sidebar (desktop e mobile)
  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!isOpen) return;
      const target = e.target as Node | null;
      if (!target) return;

      // Ignora cliques dentro do aside
      if (asideRef.current && asideRef.current.contains(target)) return;

      // Ignora o overlay (ele próprio já fecha)
      if ((target as Element).hasAttribute?.('data-sidebar-overlay')) return;

      toggleMenu();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isOpen, toggleMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openSidebar = () => {
    if (!isOpen) toggleMenu();
  };

  return (
    <>
      {/* Overlay no mobile (também fecha ao clicar) */}
      {isOpen && (
        <div
          data-sidebar-overlay
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={toggleMenu}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        role="navigation"
        aria-label="Menu principal"
        className={clsx(
          'fixed top-0 left-0 z-[110] h-full transition-all duration-300 ease-in-out',
          'bg-gradient-to-b from-pilar-green to-pilar-default-bg2-dark',
          'flex flex-col shadow-2xl border-r border-white/10',
          isOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 flex items-center justify-between p-3 border-b border-white/10">
          <button
            onClick={toggleMenu}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleMenu()}
            className="cursor-pointer text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-pilar-orange rounded-md px-1"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
            type="button"
          >
            <span className="text-xl leading-none">☰</span>
          </button>
          {isOpen && (
            <span className="text-lg font-bold text-white tracking-wide select-none">
              PdT Connect
            </span>
          )}
        </div>

        {/* Navegação */}
        <nav className="mt-2 flex-1 space-y-1 px-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {filteredRoutes.map((item, index) => (
            <SidebarItem
              key={`${item.label}-${index}`}
              item={item}
              isOpen={isOpen}
              onRequestOpen={openSidebar}
            />
          ))}
        </nav>

        {/* Rodapé */}
        <div className="mt-auto p-3 flex flex-col gap-2 border-t border-white/10">
          <SidebarButton
            icon={<LogoutIcon fontSize="small" />}
            label="Sair"
            isOpen={isOpen}
            onClick={handleLogout}
          />
          {isOpen && (
            <div className="flex items-center justify-between text-white/80 text-sm">
              <span>Tema</span>
              <ThemeSwitch />
            </div>
          )}
          <span
            className={clsx(
              'text-white/60 text-xs tracking-wide',
              isOpen ? 'text-left' : 'text-center'
            )}
          >
            {isOpen ? `Versao ${appVersion}` : appVersion}
          </span>
        </div>
      </aside>
    </>
  );
}
