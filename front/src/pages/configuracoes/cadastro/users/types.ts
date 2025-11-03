// src/pages/configuracoes/cadastro/users/types.ts
export interface User { id: number; name: string; email: string }
export interface ApiUserPayload { name: string; email: string; password?: string }
