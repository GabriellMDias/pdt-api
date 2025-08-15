import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import LogoutIcon from '@mui/icons-material/Logout';
import ThemeSwitch from '../ThemeSwitch';
import SidebarButton from './SidebarButton';
import { protectedRoutes } from '../../routes/protectedRoutes';
import SidebarItem from './SidebarItem';
import { filterRoutesByPermissions } from './filterRoutesByPermissions';
import { useMemo } from 'react';

interface SidebarProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

export default function Sidebar({ isOpen, toggleMenu }: SidebarProps) {
  const { logout, permissions, userId } = useAuth();
  const navigate = useNavigate();

  const filteredRoutes = useMemo(() => {
    if (!permissions) return [];

    return filterRoutesByPermissions(protectedRoutes, permissions, userId);
  }, [permissions, userId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-in-out bg-gradient-to-b from-pilar-green to-green-900 flex flex-col shadow-2xl',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <button onClick={toggleMenu} className="cursor-pointer" title="Menu">
          <span className="text-white text-xl">☰</span>
        </button>
        {isOpen && <span className="text-lg font-bold text-white tracking-wide">PdT Connect</span>}
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent ">
        {filteredRoutes.map((item, index) => (
          <SidebarItem key={index} item={item} isOpen={isOpen}/>
        ))}
      </nav>

      <div className="mt-auto p-3 flex flex-col gap-2 border-t border-white/20">
        <SidebarButton icon={<LogoutIcon />} label="Sair" isOpen={isOpen} onClick={handleLogout} />
        {isOpen && (
          <div className="flex items-center justify-end text-white text-sm">
            <span>Tema:</span>
            <ThemeSwitch />
          </div>
        )}
      </div>
    </div>
  );
}
