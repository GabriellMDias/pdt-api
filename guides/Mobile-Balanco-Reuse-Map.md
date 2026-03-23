# Mobile Balanco Reuse Map

## O que pode ser reaproveitado da ruptura

Reaproveitamento estrutural:

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- `SwipeDeleteCard`
- `TransmissionStatusBadge`
- `flushPendingSyncOutbox`
- uso da loja atual via `useAuthStore`
- transmissao automatica global `autoTransmitEnabled`

O que faz sentido copiar como padrao, nao como codigo isolado:

- tela principal com `FlatList` + header + FAB
- refresh por `useFocusEffect`
- fluxo manual de transmitir com modal de progresso

O que nao deve ser reaproveitado diretamente:

- `shelfCode`
- modal de prateleira
- duplicidade silenciosa por prateleira
- coleta continua por scanner

## O que pode ser reaproveitado da troca

Maior fonte de reaproveitamento para a tela de coleta:

- `ProductLookupField`
- scanner compartilhado via `useProductScanStore`
- `MovementMetricField`
- `useQuantityDecimalRevalidation`
- utilitarios de quantidade em `shared/stock-movement/utils.ts`
- fluxo produto -> quantidade -> embalagem -> total
- validacao de remocao contra saldo local pendente

O que pode servir de modelo:

- `apps/mobile/src/features/troca/components/troca-collect-screen.tsx`
- `apps/mobile/src/features/troca/data/troca-db.ts`

O que nao deve ser reaproveitado diretamente:

- `reasonId`
- modal de motivo
- dominio `exchange.reasons`
- saldo por produto e motivo de troca

## O que pode ser reaproveitado do consumo

Consumo reforca praticamente o mesmo padrao util do balanco:

- tela de coleta centrada em produto
- scanner + lookup local
- `MovementTypeToggle`
- validacao de remocao local
- listagem principal de lancamentos com outbox

O que faz mais sentido herdar do consumo do que da troca:

- nomenclatura e semantica mais proximas de uma movimentacao operacional simples
- menos acoplamento a regra de troca

O que nao deve ser reaproveitado diretamente:

- `tipoconsumo`
- saldo por produto e tipo de consumo
- tela principal simples sem agrupamento

## O que pode ser reaproveitado da producao

Da producao, o principal reaproveitamento e de organizacao operacional:

- modal de abertura rapida
- padrao de fluxo mais agil no Android
- `OperationalEntryCardShell` e `OperationalModalShell` como referencia visual
- catalogos especificos da feature sincronizados dentro do sync global

O que nao deve ser reaproveitado diretamente:

- selecao por receita
- fluxo centrado em modal unico
- dominio `production_recipes`

## O que deve ser compartilhado entre balanco, ruptura, troca, consumo e producao

### Ja compartilhado hoje e que deve continuar

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- `SwipeDeleteCard`
- `TransmissionStatusBadge`
- outbox / sync runs / `flushPendingSyncOutbox`
- `ProductLookupField`
- scanner compartilhado
- feedback sonoro operacional
- tema e componentes-base
- loja atual e preferencias globais

### Compartilhamento adicional que faz sentido antes ou durante o balanco

1. Uma consulta compartilhada de busca de produto ja existe e pode continuar sendo a base do balanco.

2. A revalidacao de decimal ja esta centralizada em `shared/stock-movement`.

3. Vale manter a tela de coleta do balanco em cima dos mesmos blocos visuais de troca/consumo:

- `MovementMetricField`
- bloco de resumo do produto
- toggle de `Adicionar / Remover`

### Compartilhamento que nao vale forcar

- uma lista unica de itens para todas as features
- um card pesado padrao para alto volume

Importante:

- o `MovementListItem` atual e bom para troca e consumo
- para balanco, especialmente na tela de itens com muito volume, provavelmente sera melhor um item proprio mais compacto e mais barato de renderizar

## O que deve continuar especifico do balanco

- catalogo de balancos sincronizados
- agrupamento por `id_balanco`
- tela intermediaria de itens do balanco selecionado
- agregacoes locais de contagem por balanco
- validacao de remocao por produto dentro do mesmo balanco
- eventual transmissao filtrada por um balanco especifico

## Estrutura sugerida para evitar duplicacao

### Feature

Sugestao de pasta:

- `apps/mobile/src/features/balanco/`

Subpastas sugeridas:

- `components/`
- `data/`
- `services/`
- `types.ts`

### Telas

Sugestao de telas:

- `balanco-screen.tsx`
  - lista agrupada por numero de balanco
- `balanco-items-screen.tsx`
  - itens coletados de um balanco especifico
- `balanco-collect-screen.tsx`
  - coleta de produtos para o balanco selecionado

### Dados locais

Modelagem sugerida, seguindo a convencao atual do app novo:

- `balance_headers`
  - representa o catalogo sincronizado dos balancos por loja
- `balance_entries`
  - representa cada coleta local

Observacao:

- nao e necessario criar tabela separada de produtos do balanco
- o catalogo compartilhado `catalog_products` ja cobre o lookup

### Repositorios e servicos

Sugestao:

- repositorio para listar balancos ativos por loja
- repositorio para listar agregados locais por balanco
- repositorio para listar itens de um balanco com filtro
- servico de sync de catalogo de balancos
- servico de dominio `balanco-db.ts`

## Riscos de acoplamento indevido

### Reutilizar demais da troca/consumo

Risco:

- transformar balanco numa simples lista de lancamentos por motivo

Mitigacao:

- manter o agrupamento por balanco como eixo da feature

### Reutilizar demais da lista visual atual

Risco:

- usar `OperationalEntryCardShell` pesado para uma tela que pode ter centenas ou milhares de itens

Mitigacao:

- criar item de lista do balanco mais compacto para a tela de itens
- deixar o shell compartilhado apenas para telas de volume baixo ou moderado

### Reutilizar a transmissao atual sem filtro adicional

Risco:

- a `flushPendingSyncOutbox` hoje filtra por `user`, `store` e `eventTypePrefix`
- isso nao distingue um balanco especifico

Mitigacao:

- se o novo balanco precisar manter o botao `Transmitir` tambem na tela de itens, vale estender a claim da outbox para aceitar filtro por `aggregateKeyPrefix`
- exemplo conceitual:
  - `aggregateKey = balance:{balanceId}:entry:{eventId}`

### Copiar a modelagem antiga sem revisar

Risco:

- reproduzir as limitacoes de `logbalancoitem` sem preparar a listagem para alto volume

Mitigacao:

- manter evento por coleta na outbox
- calcular agrupamentos por query
- desenhar a tela de itens com filtro e virtualizacao desde o inicio

## Implementacao efetivamente adotada

Reaproveitamento direto aplicado:

- de ruptura:
  - `FeatureScreenLayout`
  - `TransmissionHeader`
  - `OperationalFab`
  - fluxo padrao de transmissao manual com modal de progresso
- de troca e consumo:
  - `ProductLookupField`
  - `useProductScanStore`
  - `MovementMetricField`
  - `MovementTypeToggle`
  - `useQuantityDecimalRevalidation`
  - utilitarios de quantidade
- da infraestrutura comum:
  - `flushPendingSyncOutbox`
  - outbox por evento
  - loja atual
  - `autoTransmitEnabled`
  - feedback sonoro operacional

Extraido para uso compartilhado durante a implementacao:

- `TransmissionStatusChip`
  - status compacto para listas mais densas

Mantido especifico do balanco:

- `balance_headers`
- `balance_entries`
- agrupamento por balanco
- tela intermediaria de itens por balanco
- transmissao filtrada por `aggregateKeyPrefix = balance:{balanceId}:`

Decisao importante de UX/performance:

- a tela de itens do balanco nao reutiliza o card pesado das outras rotinas
- ela usa um item proprio, mais compacto e sem swipe por linha, para aguentar volume alto melhor
