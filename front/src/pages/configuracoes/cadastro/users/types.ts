// src/pages/configuracoes/cadastro/users/types.ts
export interface User { id: number; name: string; email: string }
export interface ApiUserPayload { name: string; email: string; password?: string }

// Permissões estruturadas no contexto
export type PermissionGrant = { code: string; global: boolean; stores: number[] };
export type PermissionBag = Array<string | PermissionGrant>;
