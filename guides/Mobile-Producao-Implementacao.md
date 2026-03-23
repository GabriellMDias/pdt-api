# Mobile Producao Implementacao

## Visao geral

A rotina de producao foi implementada no app novo com fidelidade ao legado no ponto principal:

- lista principal com pendencias
- transmissao manual
- exclusao por swipe
- FAB para abrir o cadastro
- modal unico para selecionar receita e informar quantidade produzida

Ao mesmo tempo, ela entrou na arquitetura nova com:

- SQLite local
- outbox por evento
- sync global por loja
- transmissao automatica opcional
- status robusto de conciliacao

## O que foi reaproveitado da ruptura

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- `SwipeDeleteCard`
- `TransmissionStatusBadge`
- malha de transmissao por `flushPendingSyncOutbox`

## O que foi reaproveitado da troca

- padrao de lista local + repositorio + outbox
- `MovementMetricField` para quantidade
- utilitarios de normalizacao e parsing numerico
- estrutura de tela operacional baseada em `FlatList`

## O que foi reaproveitado do consumo

- padrao de dominio proprio com catalogo especifico
- sync de catalogo dedicado por feature
- shape da integracao com backend mobile sync

## O que foi compartilhado entre as rotinas

### Componentes compartilhados novos

- `apps/mobile/src/features/shared/operational-entry/components/operational-modal-shell.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/operational-entry-card-shell.tsx`

### Componentes compartilhados reutilizados

- `TransmissionHeader`
- `OperationalFab`
- `TransmissionStatusBadge`
- `SwipeDeleteCard`
- `MovementMetricField`
- `Select`

## O que ficou especifico da producao

### Mobile

- `apps/mobile/src/features/producao/components/producao-screen.tsx`
- `apps/mobile/src/features/producao/components/producao-recipe-modal.tsx`
- `apps/mobile/src/features/producao/components/producao-list-item.tsx`
- `apps/mobile/src/features/producao/data/producao-db.ts`
- `apps/mobile/src/features/producao/services/producao-catalog-sync.ts`
- `apps/mobile/src/features/producao/types.ts`

### Banco local

- `production_recipes`
- `production_entries`

### API

- `apps/api/src/adm/producao/producao.service.ts`
- `apps/api/src/adm/producao/producao.module.ts`
- `apps/api/src/mobile-sync/processors/production-item-recorded.processor.ts`

### Sync

- dominio `production.recipes`
- evento `production.item.recorded`

## Como a rotina antiga foi adaptada para a nova base

### Fiel ao legado

- producao continua sendo `lista + modal`, nao uma tela separada de coleta
- a escolha continua sendo por receita
- o scanner nao foi introduzido no fluxo principal
- a quantidade produzida continua sendo o unico campo de lancamento

### Adaptado para a arquitetura nova

- o mobile salva localmente `recipe + product + quantity`
- a transmissao vai por outbox idempotente
- o backend processa a receita e atualiza estoque/custo
- a loja atual vem do sync global do app

## Integracao com o sync global

O sync global passou a incluir:

- `stock.products`
- `exchange.reasons`
- `consumption.reasons`
- `production.recipes`

Isso deixa a producao pronta para operar na mesma loja atual usada pelas outras rotinas.

## Limitacoes e proximos refinamentos recomendados

1. O seletor de receita ainda nao tem busca textual como no `DropDownPicker` antigo.
2. A validacao visual em Android real ainda depende de teste manual.
3. Se a lista de receitas crescer muito, vale evoluir o modal para busca interna sem perder o shell compartilhado.
