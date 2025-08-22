export interface User { id: number; name: string; email: string; createdAt?: string }
export interface Store { id: number; description: string; storeName: string; cnpj: string; activeStatus: boolean }


export interface PermissionCatalogEntry {
code: string; // ex: "users:editar"
label: string; // ex: "Editar usuários"
useStorePermission: boolean; // true => por loja; false => global
}


export type UserPermissionState = Record<string, { global: boolean; stores: number[] }>;