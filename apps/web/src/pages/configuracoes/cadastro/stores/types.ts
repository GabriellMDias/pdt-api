export interface Store {
  id: number;
  description?: string | null;
  storeName?: string | null;
  cnpj: string;
  activeStatus?: boolean | null;
}

export interface UpdateStorePayload {
  storeName?: string | null;
  activeStatus?: boolean | null;
}
