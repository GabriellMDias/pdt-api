import { type ReactNode, useEffect, useRef, useState } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyIcon from '@mui/icons-material/Key';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from './Sidebar/Sidebar';
import ChangePasswordModal from './modals/ChangePasswordModal';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'Página' }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { user, token, logout } = useAuth();
  const { items: notifications, unreadCount } = useNotifications(token);

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!isUserMenuOpen && !isNotificationsOpen) return;
      const target = e.target as Node | null;
      if (!target) return;

      if (userMenuRef.current && userMenuRef.current.contains(target)) return;
      if (notificationsRef.current && notificationsRef.current.contains(target)) return;
      setIsUserMenuOpen(false);
      setIsNotificationsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isUserMenuOpen, isNotificationsOpen]);

  return (
    <div className="relative h-screen text-white bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark">
      {/* Sidebar sobreposto */}
      <Sidebar isOpen={isMenuOpen} toggleMenu={() => setIsMenuOpen((v) => !v)} />

      {/* Conteúdo da página */}
      <div className="h-full w-full flex flex-col transition-all duration-300 pl-16">
        {/* Top bar */}
        <div className="flex justify-between items-center px-2 py-2">
          <h1 className="text-2xl font-semibold text-black dark:text-white">{title}</h1>

          <div className="flex items-center gap-2">
            {/* Notificações */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                className="relative cursor-pointer text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
                onClick={() => setIsNotificationsOpen((v) => !v)}
                aria-label="Notificações"
              >
                <NotificationsIcon fontSize="large" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-black dark:text-white">Notificações</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-3 text-sm text-black/60 dark:text-white/60">Nenhuma notificação.</p>
                    ) : (
                      notifications.slice(0, 8).map((item) => (
                        <div
                          key={item.id}
                          className={[
                            "px-3 py-2 border-b border-white/10",
                            item.readAt ? "bg-transparent" : "bg-blue-500/10"
                          ].join(" ")}
                        >
                          <p className="text-sm font-semibold text-black dark:text-white">
                            {item.notification.title}
                          </p>
                          <p className="text-xs text-black/70 dark:text-white/70">
                            {item.notification.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Menu do usuário */}
            <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="cursor-pointer text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
              onClick={() => setIsUserMenuOpen((v) => !v)}
              aria-label="Menu do usuário"
            >
              <AccountCircleIcon fontSize="large" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-white/10">
                  <p className="text-sm font-semibold text-black dark:text-white truncate">
                    {user?.name ?? 'Usuário'}
                  </p>
                  <p className="text-xs text-black/70 dark:text-white/70 truncate">
                    {user?.email ?? ''}
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                >
                  <KeyIcon fontSize="small" />
                  Alterar senha
                </button>

                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                >
                  <LogoutIcon fontSize="small" />
                  Sair
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="relative flex-1 border-t border-t-pilar-green bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark overflow-auto p-2">
          {children}
        </div>
      </div>

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        token={token}
      />
    </div>
  );
}
