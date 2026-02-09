import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyIcon from '@mui/icons-material/Key';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from './Sidebar/Sidebar';
import ChangePasswordModal from './modals/ChangePasswordModal';
import NotificationDetailsModal from './modals/NotificationDetailsModal';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationRecipient } from '../services/notifications';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'Página' }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<NotificationRecipient | null>(null);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationRecipient[]>([]);
  const [notificationsTotalPages, setNotificationsTotalPages] = useState(1);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { user, token, logout } = useAuth();
  const { unreadCount, markAllRead, fetchPage, lastEventAt } = useNotifications();
  const notificationsPageSize = 6;

  const loadNotificationsPage = useCallback(
    async (page: number) => {
      setNotificationsLoading(true);
      try {
        const data = await fetchPage(page, notificationsPageSize);
        setNotifications(data.items);
        setNotificationsTotalPages(data.totalPages);
        setNotificationsPage(data.page);
      } catch {
        setNotifications([]);
        setNotificationsTotalPages(1);
      } finally {
        setNotificationsLoading(false);
      }
    },
    [fetchPage, notificationsPageSize]
  );

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

  useEffect(() => {
    if (notificationsPage > notificationsTotalPages) {
      setNotificationsPage(notificationsTotalPages);
    }
  }, [notificationsPage, notificationsTotalPages]);

  useEffect(() => {
    if (isNotificationsOpen) {
      setNotificationsPage(1);
    }
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    loadNotificationsPage(notificationsPage);
  }, [isNotificationsOpen, loadNotificationsPage, notificationsPage]);

  useEffect(() => {
    if (!isNotificationsOpen || !lastEventAt) return;
    loadNotificationsPage(notificationsPage);
  }, [isNotificationsOpen, lastEventAt, loadNotificationsPage, notificationsPage]);

  const truncatedMessage = useMemo(() => {
    return (message: string, limit = 120) => {
      if (message.length <= limit) return message;
      return `${message.slice(0, limit).trimEnd()}...`;
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      if (isNotificationsOpen) {
        await loadNotificationsPage(notificationsPage);
      }
    } catch {
      // provider already handles error state
    }
  };

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
                <div className="absolute right-0 mt-2 w-96 rounded-xl border border-white/10 bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-black dark:text-white">Notificações</p>
                    <button
                      type="button"
                      className="text-[11px] text-blue-300 hover:text-blue-200 disabled:text-black/40 dark:disabled:text-white/30"
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                    >
                      Marcar tudo como lido
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading ? (
                      <p className="p-3 text-sm text-black/60 dark:text-white/60">Carregando...</p>
                    ) : notifications.length === 0 ? (
                      <p className="p-3 text-sm text-black/60 dark:text-white/60">Nenhuma notificação.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={[
                            "px-3 py-2 border-b border-white/10 cursor-pointer",
                            item.readAt ? "bg-transparent" : "bg-blue-500/10"
                          ].join(" ")}
                          onDoubleClick={() => setActiveNotification(item)}
                        >
                          <p className="text-sm font-semibold text-black dark:text-white">
                            {item.notification.title}
                          </p>
                          <p className="text-xs text-black/70 dark:text-white/70">
                            {truncatedMessage(item.notification.message)}
                          </p>
                          <p className="mt-1 text-[10px] text-black/50 dark:text-white/50">
                            {new Date(item.notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {notificationsTotalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 text-[11px] text-black/60 dark:text-white/60">
                      <button
                        type="button"
                        className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white disabled:text-black/30 dark:disabled:text-white/30"
                        onClick={() => setNotificationsPage((prev) => Math.max(1, prev - 1))}
                        disabled={notificationsPage === 1}
                      >
                        Anterior
                      </button>
                      <span>
                        {notificationsPage} / {notificationsTotalPages}
                      </span>
                      <button
                        type="button"
                        className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white disabled:text-black/30 dark:disabled:text-white/30"
                        onClick={() => setNotificationsPage((prev) => Math.min(notificationsTotalPages, prev + 1))}
                        disabled={notificationsPage === notificationsTotalPages}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
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
      <NotificationDetailsModal
        open={Boolean(activeNotification)}
        item={activeNotification}
        onClose={() => setActiveNotification(null)}
      />
    </div>
  );
}
