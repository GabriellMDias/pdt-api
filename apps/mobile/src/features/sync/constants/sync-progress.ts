export type SyncProgressScope =
  | 'preview.stores'
  | 'sync.users'
  | 'bootstrap.account_stores_permissions'
  | 'catalog.products'
  | 'exchange.catalog.reasons'
  | 'consumption.catalog.reasons'
  | 'production.catalog.recipes'
  | 'balance.catalog.headers'
  | 'settings.current_store';

export type SyncProgressStep = {
  scope: SyncProgressScope;
  label: string;
};

export const SYNC_PROGRESS_STEPS: SyncProgressStep[] = [
  { scope: 'sync.users', label: 'Usuarios' },
  { scope: 'bootstrap.account_stores_permissions', label: 'Conta, lojas e permissoes' },
  { scope: 'catalog.products', label: 'Produtos' },
  { scope: 'exchange.catalog.reasons', label: 'Motivos de troca' },
  { scope: 'consumption.catalog.reasons', label: 'Tipos de consumo' },
  { scope: 'production.catalog.recipes', label: 'Receitas de producao' },
  { scope: 'balance.catalog.headers', label: 'Balancos' },
  { scope: 'settings.current_store', label: 'Finalizando' },
];

export const STORE_PREVIEW_PROGRESS_STEPS: SyncProgressStep[] = [
  { scope: 'preview.stores', label: 'Lojas' },
];

export function resolveSyncProgressSteps(
  currentScope: SyncProgressScope | null,
): SyncProgressStep[] {
  if (currentScope === 'preview.stores') {
    return STORE_PREVIEW_PROGRESS_STEPS;
  }

  return SYNC_PROGRESS_STEPS;
}
