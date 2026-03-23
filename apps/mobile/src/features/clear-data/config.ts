import type { ClearDataRoutineDefinition } from '@/src/features/clear-data/types';

export const clearDataRoutineDefinitions: readonly ClearDataRoutineDefinition[] = [
  {
    key: 'rupture',
    label: 'Ruptura',
    groupLabel: 'Administrativo',
    description: 'Remove o historico local de coletas de ruptura da loja atual.',
  },
  {
    key: 'balanco',
    label: 'Balanco',
    groupLabel: 'Estoque',
    description: 'Remove os itens coletados localmente nos balancos da loja atual.',
  },
  {
    key: 'consumo',
    label: 'Consumo',
    groupLabel: 'Estoque',
    description: 'Remove o historico local de lancamentos de consumo da loja atual.',
  },
  {
    key: 'producao',
    label: 'Producao',
    groupLabel: 'Estoque',
    description: 'Remove o historico local de lancamentos de producao da loja atual.',
  },
  {
    key: 'troca',
    label: 'Troca',
    groupLabel: 'Estoque',
    description: 'Remove o historico local de lancamentos de troca da loja atual.',
  },
];
