import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import SummarizeIcon from '@mui/icons-material/Summarize';
import HomeIcon from '@mui/icons-material/Home';
import KeyIcon from '@mui/icons-material/Key';
import InventoryIcon from '@mui/icons-material/Inventory';
import SsidChartIcon from '@mui/icons-material/SsidChart';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import BuildIcon from '@mui/icons-material/Build';
import HomePage from '../pages/HomePage';
import UsersPage from '../pages/configuracoes/cadastro/users/UsersPage';
import PermissionsPage from '../pages/configuracoes/permissions/PermissionsPage';
import type { JSX } from 'react';
import RelatorioICMS from '../pages/fiscal/obrigacoes/RelatorioSPEDUpload';
import RelatorioSPEDAnalises from '../pages/fiscal/obrigacoes/RelatorioSPEDAnalises';
import AnaliseEstoquePage from '../pages/estoque/analise/AnaliseEstoquePage';
import AnaliseEstoqueDiaPage from '../pages/estoque/analise/AnaliseEstoqueDiaPage';
import DbScriptsPage from '../pages/configuracoes/acoes-agendadas/db-scripts/DbScriptsPage';
import DbScriptRunsPage from '../pages/configuracoes/acoes-agendadas/db-scripts/DbScriptRunsPage';
import ParametersPage from '../pages/configuracoes/parameters/ParametersPage';
import JobsPage from '../pages/configuracoes/acoes-agendadas/jobs/JobsPage';
import JobRunsPage from '../pages/configuracoes/acoes-agendadas/jobs/JobRunsPage';


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
    label: 'Estoque',
    icon: <InventoryIcon />,
    showInSidebar: true,
    children: [
      {
        path: '/estoque/analises/mes',
        label: 'Análises',
        icon: <SsidChartIcon />,
        showInSidebar: true,
        requiredPermissions: ["stock-analysis:consultar"],
        element: <AnaliseEstoquePage />
      },
      {
        path: '/estoque/analises/dia',
        label: 'Análise por dia',
        requiredPermissions: ["stock-analysis:consultar"],
        element: <AnaliseEstoqueDiaPage />,
        showInSidebar: false
      }
    ]
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
            requiredPermissions: ['sped:consultarRelatorioSPED'],
            showInSidebar: true,
          },
          {
            path: '/relatorio_sped/analises/:id',
            label: 'Analises SPED',
            element: <RelatorioSPEDAnalises />,
            requiredPermissions: ['sped:consultarRelatorioSPED'],
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
            path: '/configuracoes/cadastro/usuarios',
            label: 'Usuários',
            icon: <GroupIcon />,
            element: <UsersPage />,
            requiredPermissions: ['users:consultar', 'users:incluir', 'users:editar', 'users:excluir'],
            showInSidebar: true,
          }
        ],
      },
      {
        label: 'Ações Agendadas',
        showInSidebar: true,
        children: [
          {
            path: '/configuracoes/acoesagendadas/db-scripts',
            label: 'Scripts BD',
            showInSidebar: true,
            icon: <ManageHistoryIcon />,
            element: <DbScriptsPage />,
            requiredPermissions: ['dbScripts:consultar'],
          },
          {
            path: '/configuracoes/acoesagendadas/db-scripts/:id/runs',
            label: 'Log de Execuções Scripts de Banco de Dados',
            showInSidebar: false,
            element: <DbScriptRunsPage />,
            requiredPermissions: ['dbScripts:consultar']
          },
          {
            path: '/configuracoes/acoesagendadas/jobs',
            label: 'Jobs',
            showInSidebar: true,
            icon: <WorkHistoryIcon />,
            element: <JobsPage />,
            requiredPermissions: ['dbScripts:consultar'],
          },
          {
            path: '/configuracoes/acoesagendadas/jobs/:id/runs',
            label: 'Log de Execuções Jobs',
            showInSidebar: false,
            element: <JobRunsPage />,
            requiredPermissions: ['dbScripts:consultar']
          }
        ]
      },
      {
        path: '/configuracoes/permissoes',
        label: 'Permissões',
        showInSidebar: true,
        icon: <KeyIcon />,
        element: <PermissionsPage />,
        requiredPermissions: ["permissions:consultar", "permissions:editar"]
      },
      {
        path: '/configuracoes/parametros',
        label: "Parâmetros",
        showInSidebar: true,
        icon: <BuildIcon />,
        element: <ParametersPage />,
        requiredPermissions: ["parameters:consultar", "parameters:editar"]
      }
    ],
  },
];
