// src/pages/configuracoes/cadastro/users/types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  codigoUsuarioVrMaster?: number | null;
  notifyCostCenterType?: boolean;
  activeStatus?: boolean;
}

export interface ApiUserPayload {
  name: string;
  email: string;
  password?: string;
  codigoUsuarioVrMaster?: number | null;
  notifyCostCenterType?: boolean;
  activeStatus?: boolean;
}

export interface VrMasterUser {
  id: number;
  login: string;
  nome: string;
}
