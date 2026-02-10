// src/pages/configuracoes/cadastro/users/types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  notifyCostCenterType?: boolean;
  activeStatus?: boolean;
}

export interface ApiUserPayload {
  name: string;
  email: string;
  password?: string;
  notifyCostCenterType?: boolean;
  activeStatus?: boolean;
}
