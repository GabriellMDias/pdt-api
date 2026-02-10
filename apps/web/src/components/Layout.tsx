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

export default function Layout({ children, title = 'Pagina' }: LayoutProps) {
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
    [fetchPage, notificationsPageSize],
  );

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!isUserMenuOpen && !isNotificationsOpen) return;
      const target = e.target as Node | null;
      const element = target instanceof Element ? target : null;
      if (!element) return;

      if (element.closest('[data-layout-user-menu-root]')) return;
      if (element.closest('[data-layout-notifications-root]')) return;
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
      // Provider already handles error state.
    }
  };

  const handleToggleNotifications = () => {
    setIsUserMenuOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleToggleUserMenu = () => {
    setIsNotificationsOpen(false);
    setIsUserMenuOpen((prev) => !prev);
  };

  const menuSurfaceClass =
    'pointer-events-auto absolute right-0 top-full mt-2.5 overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-md shadow-[0_20px_48px_-22px_rgba(15,23,42,0.55)] ring-1 ring-black/5 dark:border-white/15 dark:bg-pilar-default-bg-dark/95 dark:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)] dark:ring-white/10 z-[90]';

  const iconButtonBaseClass =
    'relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border cursor-pointer transition-all duration-200';

  return (
    <div className="relative h-screen bg-neutral-100 text-white dark:bg-[#1f1f1c]">
      <Sidebar isOpen={isMenuOpen} toggleMenu={() => setIsMenuOpen((v) => !v)} />

      <div className="h-full w-full flex flex-col transition-all duration-300 pl-16">
        <div className="relative z-[60] flex items-center justify-between overflow-visible border-b border-neutral-200/80 bg-white/70 px-3 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-pilar-default-bg-dark/55">
          <h1 className="text-xl font-semibold text-black dark:text-white">{title}</h1>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationsRef} data-layout-notifications-root>
              <button
                type="button"
                className={[
                  iconButtonBaseClass,
                  isNotificationsOpen
                    ? 'border-emerald-300 bg-white text-emerald-700 shadow-[0_12px_30px_-18px_rgba(5,150,105,0.55)] dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:shadow-[0_14px_34px_-18px_rgba(16,185,129,0.45)]'
                    : 'border-neutral-300 bg-white/90 text-neutral-700 hover:border-neutral-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/30 dark:hover:bg-white/10',
                ].join(' ')}
                onClick={handleToggleNotifications}
                aria-label="Notificacoes"
              >
                <NotificationsIcon fontSize="medium" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className={`${menuSurfaceClass} w-[26rem]`}>
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-200/80 bg-gradient-to-b from-white/80 to-white/50 p-3 dark:border-white/10 dark:from-white/5 dark:to-transparent">
                    <p className="text-sm font-semibold text-black dark:text-white">Notificacoes</p>
                    <button
                      type="button"
                      className="rounded-md border border-sky-300/80 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-200 dark:hover:bg-sky-500/20"
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                    >
                      Marcar tudo como lido
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading ? (
                      <p className="p-3 text-sm text-neutral-500 dark:text-neutral-400">Carregando...</p>
                    ) : notifications.length === 0 ? (
                      <p className="p-3 text-sm text-neutral-500 dark:text-neutral-400">Nenhuma notificacao.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={[
                            'cursor-pointer border-b border-neutral-200/70 px-3 py-2.5 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/10',
                            item.readAt ? 'bg-transparent' : 'bg-sky-50/80 dark:bg-sky-500/12',
                          ].join(' ')}
                          onDoubleClick={() => setActiveNotification(item)}
                        >
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                            {item.notification.title}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300">
                            {truncatedMessage(item.notification.message)}
                          </p>
                          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                            {new Date(item.notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {notificationsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-neutral-200/80 bg-white/70 px-3 py-2 text-[11px] text-neutral-600 dark:border-white/10 dark:bg-transparent dark:text-neutral-400">
                      <button
                        type="button"
                        className="rounded-md px-1.5 py-0.5 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10 disabled:text-neutral-400 dark:disabled:text-neutral-500"
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
                        className="rounded-md px-1.5 py-0.5 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10 disabled:text-neutral-400 dark:disabled:text-neutral-500"
                        onClick={() => setNotificationsPage((prev) => Math.min(notificationsTotalPages, prev + 1))}
                        disabled={notificationsPage === notificationsTotalPages}
                      >
                        Proxima
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef} data-layout-user-menu-root>
              <button
                type="button"
                className={[
                  iconButtonBaseClass,
                  isUserMenuOpen
                    ? 'border-emerald-300 bg-white text-emerald-700 shadow-[0_12px_30px_-18px_rgba(5,150,105,0.55)] dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:shadow-[0_14px_34px_-18px_rgba(16,185,129,0.45)]'
                    : 'border-neutral-300 bg-white/90 text-neutral-700 hover:border-neutral-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/30 dark:hover:bg-white/10',
                ].join(' ')}
                onClick={handleToggleUserMenu}
                aria-label="Menu do usuario"
              >
                <AccountCircleIcon fontSize="medium" />
              </button>

              {isUserMenuOpen && (
                <div className={`${menuSurfaceClass} w-72`}>
                  <div className="border-b border-neutral-200/80 bg-gradient-to-b from-white/80 to-white/50 p-3 dark:border-white/10 dark:from-white/5 dark:to-transparent">
                    <p className="text-sm font-semibold text-black dark:text-white truncate">
                      {user?.name ?? 'Usuario'}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                      {user?.email ?? ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10"
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
                    className="flex w-full cursor-pointer items-center gap-2 border-t border-neutral-200/80 px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/10"
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

        <div className="relative z-0 flex-1 overflow-auto bg-gradient-to-b from-neutral-100 to-neutral-50 p-2 dark:from-[#22221f] dark:to-[#1c1c19]">
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
