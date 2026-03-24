import { ENV } from '@/src/config/env';
import type { DevSeedRoutineKey, DevSeedVolumeOption } from '@/src/features/dev-seed/types';

export const DEV_LOCAL_SEED_ENABLED = !ENV.IS_PRODUCTION;

export const devSeedVolumeOptions: readonly DevSeedVolumeOption[] = [
  { value: 10, label: '10 itens' },
  { value: 100, label: '100 itens' },
  { value: 500, label: '500 itens' },
  { value: 2000, label: '2000 itens' },
] as const;

export const devSeedRoutineDefinitions: readonly {
  key: DevSeedRoutineKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'rupture',
    label: 'Ruptura',
    description: 'Gera itens pendentes por prateleira para testar lista, scroll e transmissao.',
  },
  {
    key: 'troca',
    label: 'Troca',
    description: 'Gera lancamentos coerentes com motivos, produtos e saldo local pendente.',
  },
  {
    key: 'consumo',
    label: 'Consumo',
    description: 'Gera lancamentos pendentes usando tipos de consumo e produtos locais validos.',
  },
  {
    key: 'producao',
    label: 'Producao',
    description: 'Gera producoes pendentes usando receitas e produtos de destino ja sincronizados.',
  },
  {
    key: 'balanco',
    label: 'Balanco',
    description: 'Gera itens pendentes agrupados por balanco para testar volume e transmissao.',
  },
] as const;
