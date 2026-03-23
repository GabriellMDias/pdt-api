# Mobile Producao Reuse Map

## O que pode ser reaproveitado da ruptura

Reaproveitamento estrutural:

- `FeatureScreenLayout` para a tela principal
- `TransmissionHeader` para `Ultima Sincronizacao` + `Transmitir`
- `OperationalFab` para abrir o modal de cadastro
- `SwipeDeleteCard` para exclusao por gesto
- `TransmissionStatusBadge` para `pendente / enviado / erro`
- `flushPendingSyncOutbox` para transmissao manual e automatica
- configuracao global de loja atual e `autoTransmitEnabled`

Arquivos-base:

- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/transmission-header.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/operational-fab.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/swipe-delete-card.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/transmission-status-badge.tsx`

O que nao deve vir da ruptura:

- `shelfCode`
- scanner como fluxo central
- coleta continua
- duplicidade silenciosa por prateleira
- modal de prateleira

## O que pode ser reaproveitado da troca

Reaproveitamento utilitario e de shell:

- padrao de tela principal com `FlatList` + header + FAB
- padrao de refresh local via `useFocusEffect`
- outbox por evento
- integracao com `autoTransmitEnabled`
- integracao com a loja atual
- `MovementMetricField`
- utilitarios numericos de input e formatacao
- modal de selecao como conceito visual

Arquivos-base:

- `apps/mobile/src/features/troca/components/troca-screen.tsx`
- `apps/mobile/src/features/troca/data/troca-db.ts`
- `apps/mobile/src/features/shared/stock-movement/components/movement-reason-modal.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-metric-field.tsx`
- `apps/mobile/src/features/shared/stock-movement/utils.ts`

O que nao deve ser reaproveitado diretamente:

- `MovementTypeToggle` ou `TrocaAddRemoveToggle`
- validacao de saldo pendente para remocao
- semantica de `reason`
- campos de produto e informacoes de estoque como eixo principal da coleta

## O que pode ser reaproveitado do consumo

O consumo reforca quase os mesmos pontos da troca:

- shell da lista principal
- modal inicial para escolher um catalogo especifico antes do cadastro
- estrutura de outbox e persistencia local
- naming e pattern de repositorio/catalog sync especificos de dominio

Arquivos-base:

- `apps/mobile/src/features/consumo/components/consumo-screen.tsx`
- `apps/mobile/src/features/consumo/data/consumo-db.ts`
- `apps/mobile/src/features/consumo/services/consumo-catalog-sync.ts`
- `apps/api/src/adm/consumo/consumo.service.ts`
- `apps/api/src/mobile-sync/processors/consumption-item-recorded.processor.ts`

O que nao deve ser reaproveitado diretamente:

- busca e scanner de produto como coleta principal
- `MovementTypeToggle`
- saldo pendente por tipo de consumo

## O que deve ser compartilhado entre as quatro rotinas

### Ja compartilhado hoje

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- `SwipeDeleteCard`
- `TransmissionStatusBadge`
- `useAuthStore` para usuario, loja atual, conectividade e transmissao automatica
- `flushPendingSyncOutbox`
- sync global por loja
- tema, componentes base e badges

### Compartilhamento adicional que faz sentido

- um modal generico de selecao de catalogo com `Select`
- um list item base so com:
  - bloco de dados customizavel
  - faixa de status
  - swipe delete
- utilitarios numericos para quantidade e formatacao

### Compartilhamento que nao vale forcar

- scanner de produto
- lookup de produto
- toggle `Adicionar / Remover`
- saldo pendente por produto/motivo

Esses itens servem bem a troca/consumo e parcialmente a ruptura, mas nao sao eixo da producao legada.

## O que pode ser reutilizado diretamente

Sem refactor grande, producao pode nascer reutilizando:

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- `SwipeDeleteCard`
- `TransmissionStatusBadge`
- `MovementMetricField`
- `normalizeManualNumberInput`
- `parseInputNumber`
- `formatDisplayNumber`
- `Button`, `Card`, `Select`
- `flushPendingSyncOutbox`
- `runGlobalSync`
- `insertSyncRun` / `finishSyncRun`
- preferencia global `autoTransmitEnabled`

## O que precisa virar componente compartilhado

### Vale extrair antes de implementar producao

1. `SelectionModal` ou `CatalogSelectionModal`

Motivo:

- hoje `MovementReasonModal` esta acoplado a `reasonId/description`
- producao precisa selecionar receita, nao motivo
- o visual e o fluxo de confirmacao sao muito parecidos

Sugerido:

- criar um modal compartilhado parametrizavel
- manter `TrocaReasonModal` e `ConsumoReasonModal` como wrappers finos
- criar depois `ProducaoRecipeModal` como outro wrapper

2. `OperationalEntryListItemShell`

Motivo:

- `MovementListItem` atende bem troca e consumo
- mas producao exibe `Receita` e `Quantidade Produzida`, nao `Motivo + Produto + Codigo de Barras`
- um shell menor evitaria copiar a combinacao `SwipeDeleteCard + status`

### Nao precisa extrair antes

- uma super tela generica de coleta
- um super repositorio unico para todas as rotinas

## O que pode virar servico compartilhado

### Ja existe e deve continuar

- `product-catalog-sync.ts`
- `mobile-sync-service.ts`
- `global-sync.service.ts`

### Novo servico de sync sugerido

- `features/producao/services/producao-catalog-sync.ts`

Padrao esperado:

- igual a `troca-catalog-sync.ts` e `consumo-catalog-sync.ts`
- consumir novo dominio `production.recipes`

### No backend

Novo servico de dominio:

- `apps/api/src/adm/producao/producao.service.ts`

Responsabilidades sugeridas:

- `listRecipesForMobile(storeId)`
- `recordMobileProduction(...)`

Conclusao:

- a malha de sync pode ser reaproveitada
- o dominio de negocio deve continuar proprio da producao

## O que pode virar utilitario compartilhado

- formatacao de quantidade
- parsing pt-BR para quantidade manual
- montagem do resumo de sincronizacao
- derivacao de status da outbox

O que nao deve virar utilitario compartilhado:

- regras de negocio de saldo pendente
- regras de explosao de receita
- deduplicacao silenciosa

## O que deve continuar especifico da producao

### Mobile

- `production_recipes`
- `production_entries`
- `producao-screen.tsx`
- `producao-recipe-modal.tsx`
- possivel `producao-list-item.tsx`
- repositorio de receitas
- repositorio de lancamentos de producao

### API

- `production.item.recorded`
- processor especifico
- catalogo `production.recipes`
- logica de validacao do produto produzido
- baixa de ingredientes
- calculo de custo
- persistencia em `producao` e `producaoitem`

## O que precisa ser refatorado antes de implementar producao

Refactor pequeno e seguro:

- desacoplar `MovementReasonModal` para um modal mais generico de selecao
- opcionalmente criar um shell mais neutro para list item operacional

Motivo:

- isso reduz duplicacao entre troca, consumo e producao
- sem tentar unificar dominos diferentes demais

## O que pode ser implementado direto sem refactor grande

Mesmo sem grande refactor, ja da para implementar producao com boa base:

- tela principal propria
- lista propria
- modal proprio de receita
- repositorio proprio
- processor proprio

Reaproveitando:

- header
- FAB
- status badge
- swipe delete
- metric field
- sync/outbox
- settings globais

## Dependencias tecnicas e lacunas atuais

### No mobile novo

Hoje `apps/mobile/src/features/mobile-sync/types.ts` suporta:

- `rupture.products`
- `stock.products`
- `exchange.reasons`
- `consumption.reasons`

Ainda nao existe:

- `production.recipes`

### Na API nova

Hoje `apps/api/src/mobile-sync/mobile-sync.catalog.service.ts` suporta:

- `stock.products`
- `rupture.products`
- `exchange.reasons`
- `consumption.reasons`

Ainda nao existe:

- catalog pull de receitas de producao
- processor mobile para producao
- servico de dominio `ProducaoService`

### No app novo

Hoje existe apenas a entrada de navegacao/favoritos para producao em:

- `apps/mobile/src/features/home/home-navigation.tsx`

Nao existe feature implementada em:

- `apps/mobile/src/features/producao/*`

## Riscos de acoplamento indevido

1. Forcar producao a usar o fluxo de busca de produto de troca/consumo

Risco:

- descaracteriza o legado
- adiciona scanner onde ele nao era eixo principal
- mistura produto com receita

2. Duplicar o catalogo de produtos dentro do catalogo de receitas

Risco:

- duas fontes de verdade para os mesmos atributos
- custo maior de manutencao

3. Portar a conciliacao antiga por `idProduto`

Risco:

- colisao entre lancamentos diferentes do mesmo produto

4. Tentar unificar troca, consumo e producao em um unico dominio de banco

Risco:

- schemas artificiais
- ifs demais na UI e na persistencia
- piora da evolucao futura

## Sugestao de estrutura para evitar duplicacao

### Mobile

- `apps/mobile/src/features/producao/components/producao-screen.tsx`
- `apps/mobile/src/features/producao/components/producao-recipe-modal.tsx`
- `apps/mobile/src/features/producao/components/producao-list-item.tsx`
- `apps/mobile/src/features/producao/data/producao-db.ts`
- `apps/mobile/src/features/producao/services/producao-catalog-sync.ts`
- `apps/mobile/src/features/producao/types.ts`

### Shared

- `apps/mobile/src/features/shared/operational-entry/*`
- `apps/mobile/src/features/shared/stock-movement/components/movement-metric-field.tsx`
- `apps/mobile/src/features/shared/stock-movement/utils.ts`
- `apps/mobile/src/features/shared/selection/*` ou extensao segura de `stock-movement/components`

### API

- `apps/api/src/adm/producao/producao.module.ts`
- `apps/api/src/adm/producao/producao.service.ts`
- `apps/api/src/mobile-sync/processors/production-item-recorded.processor.ts`

## Resumo arquitetural

Producao deve nascer no app novo como:

- um dominio proprio
- uma UX fiel ao legado de `lista + modal`
- uma rotina sem scanner no primeiro corte
- um catalogo novo de receitas por loja
- uma transmissao por evento idempotente

O reaproveitamento correto nao e copiar troca ou consumo:

- e usar o shell operacional e a infraestrutura de sync/outbox
- mantendo receita e processamento de producao como conceitos proprios

## Estado apos implementacao

O que entrou de fato na base nova foi isto:

### Reaproveitado da ruptura

- shell operacional de lista/transmissao
- exclusao por swipe
- badge de status de transmissao
- FAB operacional

### Reaproveitado da troca

- infraestrutura de lista local + outbox
- padrao de `flushPendingSyncOutbox`
- `MovementMetricField`
- utilitarios numericos de quantidade

### Reaproveitado do consumo

- padrao de dominio proprio com catalogo especifico + entries especificos
- integracao com sync global por store
- estilo geral de tela principal operacional

### Extraido para compartilhamento real

- `features/shared/operational-entry/components/operational-modal-shell.tsx`
- `features/shared/operational-entry/components/operational-entry-card-shell.tsx`

Essas pecas passaram a servir para:

- `MovementReasonModal`
- lista de troca/consumo
- modal e lista de producao

### Mantido especifico da producao

- `production_recipes`
- `production_entries`
- evento `production.item.recorded`
- processor de producao na API
- catalog sync de receitas por loja
- modal proprio de receita + quantidade

### Confirmacao arquitetural

Producao nao foi implementada como:

- uma copia da coleta de troca
- uma quarta versao do scanner de produto
- um fluxo acoplado a `reasonId`

Ela entrou como dominio proprio, mas apoiada na mesma malha operacional compartilhada das outras rotinas.
