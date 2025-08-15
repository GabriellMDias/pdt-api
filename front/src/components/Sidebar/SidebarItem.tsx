import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SidebarButton from './SidebarButton';
import type { ProtectedRoute } from '../../routes/protectedRoutes';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';


interface Props {
  item: ProtectedRoute;
  isOpen: boolean;
  level?: number;
}

export default memo(function SidebarItem({ item, isOpen, level = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (item.children) {
      setExpanded(!expanded);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const indent = level * 16 + 16;
  const isActive = item.path && location.pathname === item.path;

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
        className={clsx({
          'bg-white/20 text-orange-300 font-medium': isActive, 
        }, 'w-full')}
      />

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {item.children?.map((child, idx) => (
              <SidebarItem key={idx} item={child} isOpen={isOpen} level={level + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
})
