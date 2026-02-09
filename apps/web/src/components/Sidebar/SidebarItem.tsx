// src/components/Sidebar/SidebarItem.tsx
import { memo, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SidebarButton from './SidebarButton';
import type { ProtectedRoute } from '../../routes/protectedRoutes';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  item: ProtectedRoute;
  isOpen: boolean;
  level?: number;
  onRequestOpen?: () => void; // <- novo: pedir para abrir o sidebar
}

function useIsRouteActive(path?: string) {
  const location = useLocation();
  return useMemo(() => {
    if (!path) return false;
    const exact = matchPath({ path, end: true }, location.pathname);
    const partial = matchPath({ path, end: false }, location.pathname);
    return Boolean(exact || partial);
  }, [location.pathname, path]);
}

export default memo(function SidebarItem({ item, isOpen, level = 0, onRequestOpen }: Props) {
  const navigate = useNavigate();
  const isActiveSelf = useIsRouteActive(item.path);
  const [expanded, setExpanded] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const anyChildActive = (item.children ?? []).some((c) => useIsRouteActive(c.path));
  const isActive = isActiveSelf || anyChildActive;

  // Auto-expand quando rota atual estiver dentro do grupo
  useEffect(() => {
    if (anyChildActive && !expanded) setExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyChildActive]);

  const handleClick = () => {
    // Se o sidebar está fechado, o primeiro clique apenas abre
    if (!isOpen) {
      onRequestOpen?.();
      if (item.children?.length) setExpanded(true);
      return;
    }

    if (item.children?.length) {
      setExpanded((v) => !v);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const indent = level * 14 + 16;

  return (
    <div>
      <SidebarButton
        icon={
          item.icon ||
          (item.children && (
            <ExpandMoreIcon
              className={clsx(
                'transition-transform duration-300',
                expanded ? 'rotate-180' : 'rotate-0'
              )}
            />
          ))
        }
        label={item.label}
        isOpen={isOpen}
        onClick={handleClick}
        style={{ paddingLeft: `${indent}px` }}
        className="w-full"
        active={isActive}
        expandable={Boolean(item.children?.length)}
      />

      <AnimatePresence initial={false}>
        {expanded && item.children?.length ? (
          <motion.div
            key="submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-label={`Submenu de ${item.label}`}
          >
            {item.children.map((child, idx) => (
              <SidebarItem
                key={`${child.label}-${idx}`}
                item={child}
                isOpen={isOpen}
                level={level + 1}
                onRequestOpen={onRequestOpen}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
