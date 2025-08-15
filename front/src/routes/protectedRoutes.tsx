import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import SummarizeIcon from '@mui/icons-material/Summarize';
import HomeIcon from '@mui/icons-material/Home';
import HomePage from '../pages/HomePage';
import UserRegisterPage from '../pages/UsersPage';
import type { JSX } from 'react';
import RelatorioICMS from '../pages/fiscal/obrigacoes/RelatorioSPEDUpload';
import RelatorioSPEDAnalises from '../pages/fiscal/obrigacoes/RelatorioSPEDAnalises';


export interface ProtectedRoute {
  path?: string;
  label: string;
  icon?: JSX.Element;
  element?: JSX.Element;
  requiredPermissions?: string[];
  showInSidebar?: boolean;
  children?: ProtectedRoute[];
}


export const protectedRoutes: ProtectedRoute[] = [
  {
    path: '/home',
    label: 'Home',
    icon: <HomeIcon />,
    element: <HomePage />,
    showInSidebar: true,
  },
  {
    label: 'Fiscal',
    icon: <SummarizeIcon />,
    showInSidebar: true,
    children: [
      {
        label: 'Obrigações Fiscais',
        showInSidebar: true,
        children: [{
            path: '/relatorio_sped/upload',
            label: 'Rel. SPED',
            icon: <SummarizeIcon />,
            element: <RelatorioICMS />,
            showInSidebar: true,
          },
          {
            path: '/relatorio_sped/analises/:id',
            label: 'Analises SPED',
            element: <RelatorioSPEDAnalises />,
            showInSidebar: false,
          }
        ]
      }
    ]
  },
  {
    label: 'Configurações',
    icon: <SettingsIcon />,
    showInSidebar: true,
    children: [
      {
        label: 'Cadastro',
        showInSidebar: true,
        children: [
          {
            path: '/usuarios',
            label: 'Usuários',
            icon: <GroupIcon />,
            element: <UserRegisterPage />,
            requiredPermissions: ['users:consultar', 'users:incluir', 'users:editar', 'users:excluir'],
            showInSidebar: true,
          },
        ],
      },
    ],
  },
];
