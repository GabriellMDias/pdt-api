# Mobile Troca Reuse Map

## O que pode ser reaproveitado da ruptura nova

### Infraestrutura de app

- `useAuthStore`
  - usuario autenticado
  - loja atual global
  - parametro global `autoTransmitEnabled`
- `runGlobalSync`
  - ponto unico de sync global
  - ja persiste loja atual por usuario
- `user_preferences`
  - persistencia por usuario para preferencias da rotina
- `sync_runs`
  - auditoria local das sincronizacoes
- `sync_outbox_events`
  - fila local resiliente com retry e status

### Infraestrutura de lista/transmissao

- `FeatureScreenLayout`
- padrao de tela principal com:
  - ultima sincronizacao
  - botao `Transmitir`
  - `FlatList`
  - FAB de inclusao
- padrao de exclusao por swipe com `react-native-gesture-handler`
- badge/status baseado no estado da outbox

### Busca de produto, scanner e feedback

- `ProductLookupInput`
- scanner em tela dedicada com `CameraView`
- `BarcodeScannerOverlay`
- store transitivo para resultado do scanner
- servico de audio operacional
- lookup de barcode por:
  - EAN exato
  - codigo interno exato
  - codigo pesado por substring

### Persistencia e sync

- padrao de `*_db.ts` por feature
- repositorio local + outbox no mesmo fluxo transacional
- `flushPendingSyncOutbox` para push filtrado por prefixo
- padrao de status local:
  - pending
  - sending
  - sent
  - error_temporary
  - error_permanent

## O que deve ser compartilhado entre ruptura e troca

### Componentes compartilhados sugeridos

- `features/shared/operational-entry/components/TransmissionHeader`
  - ultima sincronizacao
  - loja atual
  - botao transmitir
- `features/shared/operational-entry/components/TransmissionStatusBadge`
  - hoje existe em `RuptureStatusBadge`, mas a base visual e generica
- `features/shared/operational-entry/components/SwipeDeleteRow`
  - hoje o padrao esta dentro de `RuptureListItem`
- `features/shared/products/components/ProductLookupField`
  - evolucao de `ProductLookupInput` para nome neutro
- `features/shared/barcode`
  - overlay e tela base de scanner com callback pluggable

### Servicos compartilhados sugeridos

- `features/shared/products/services/barcode-lookup`
  - hoje a logica esta acoplada em `rupture-db.ts`
  - deve virar lookup neutro por catalogo/produto
- `features/shared/products/services/weighted-barcode`
  - utilitario para extrair `productId` e, quando aplicavel, quantidade estimada
- `features/shared/operational-feedback/operational-feedback.service`
  - ja esta compartilhado de fato
- `features/shared/transmission/services/auto-transmit`
  - wrapper em torno de `flushPendingSyncOutbox`
  - evita cada feature repetir o mesmo bloco `se autoTransmitEnabled && online`

### Repositorios/utilitarios compartilhados sugeridos

- repositorio de catalogo de produtos mais generico do que `catalog-products.repository.ts`
- helpers de hash/outbox para eventos operacionais
- utilitarios de quantidade assinada:
  - somar linhas locais
  - converter `add/remove` em quantidade positiva/negativa

## O que deve continuar separado

### Especifico da ruptura

- `prateleira`
- modal de prateleira
- regra de duplicidade silenciosa `mesmo produto + mesma prateleira`
- payload/evento `rupture.item.reported`
- dominio de catalogo `rupture.products`
- tela principal e coleta orientadas a item unico por prateleira

### Especifico da troca

- `motivo de troca`
- selecao de motivo antes da coleta
- campos `quantidade`, `embalagem`, `total`
- toggle `Adicionar / Remover`
- validacao de retirada contra saldo pendente local
- payload/evento de troca com quantidade assinada
- richer product projection para custo/preco/decimal

## O que NAO deve ser reaproveitado da ruptura como esta

- `RuptureShelfModal`
- `rupture_entries`
- `findPendingRuptureEntryByShelfAndProduct`
- regra de auto-save com scanner continuo
- shape do payload da ruptura
- catalogo atual `catalog_products` se ele continuar contendo apenas campos da ruptura

## O que precisa ser extraido ou refatorado antes de comecar a troca

### Refatoracao recomendada antes ou durante o primeiro corte

1. Extrair o lookup de produto de `rupture-db.ts` para uma camada neutra
   - hoje a logica de scanner por barcode/internal/weighted esta boa, mas presa ao namespace de ruptura

2. Separar UI compartilhavel da lista operacional
   - `RuptureListItem` mistura:
     - swipe
     - card
     - dados especificos da ruptura
   - a troca podera reaproveitar o shell visual, nao o conteudo literal

3. Rever o schema do catalogo de produtos
   - opcao A: ampliar o catalogo atual com colunas extras usadas por troca
   - opcao B: criar uma projecao local mais generica para rotinas de estoque

4. Criar um helper generico de persistencia `entry + outbox`
   - a troca nao deve copiar o fluxo transacional da ruptura linha por linha

### O que pode ser implementado direto sem refatorar demais

- tela principal de troca seguindo o shell da ruptura
- modal de selecao de motivo
- tabela local `troca_entries`
- repositorio local `troca.repository.ts`
- `troca-db.ts` proprio
- listagem com status baseado na outbox
- transmissao manual/automatica usando `flushPendingSyncOutbox`

## Proposta de estrutura de pastas/modulos

Estrutura sugerida para evitar duplicacao:

- `src/features/shared/products/`
  - `components/ProductLookupField.tsx`
  - `services/product-barcode-lookup.ts`
  - `services/weighted-barcode.ts`
  - `types.ts`
- `src/features/shared/operational-entry/`
  - `components/TransmissionHeader.tsx`
  - `components/TransmissionStatusBadge.tsx`
  - `components/SwipeDeleteCard.tsx`
  - `services/auto-transmit.ts`
- `src/features/troca/`
  - `components/troca-screen.tsx`
  - `components/troca-collect-screen.tsx`
  - `components/troca-reason-modal.tsx`
  - `components/troca-add-remove-toggle.tsx`
  - `components/troca-quantity-card.tsx`
  - `data/troca-db.ts`
  - `services/troca-catalog-sync.ts`
  - `types.ts`
- `src/database/repositories/`
  - `troca.repository.ts`

## Proposta arquitetural objetiva

### O que vira componente compartilhado

- scanner overlay
- input de busca de produto
- header de transmissao
- badge de status
- linha swipeable

### O que vira servico compartilhado

- lookup de produto por codigo
- audio operacional
- auto transmit por outbox
- sincronizacao de catalogo por dominio

### O que vira utilitario compartilhado

- parser de codigo pesado
- normalizacao de quantidade assinada
- formatacao de mensagens/status

### O que continua especifico da ruptura

- prateleira
- coleta item a item por prateleira
- duplicidade silenciosa da mesma prateleira

### O que sera especifico da troca

- motivos
- calculo de total
- regra add/remove
- validacao de retirada
- shape do payload/evento

## Dependencias tecnicas para a troca comecar

Dependencias mobile:

- nova migration para `troca_entries`
- catalogo local com campos extras de produto
- repositorio local para totais por produto/motivo

Dependencias de sync/API:

- catalogo de `motivos de troca`
- catalogo de produtos com campos extras necessarios
- processor mobile-sync para evento de troca
- contrato de push idempotente para troca

## Riscos de acoplamento indevido

- acoplar a troca ao conceito de `prateleira`
- copiar `rupture-db.ts` e `rupture-screen.tsx` em vez de extrair infraestrutura
- usar o catalogo da ruptura sem os campos que a troca exige
- reaproveitar o modo continuo do scanner em um fluxo que precisa de quantidade manual
- misturar regras de duplicidade da ruptura com saldo/remocao da troca

## Recomendacao pratica para a primeira entrega tecnica

Primeiro corte da troca no app novo:

1. criar sync de `motivos de troca`
2. ampliar ou redefinir o catalogo local de produto para estoque/troca
3. implementar a lista principal de troca usando o shell da ruptura
4. implementar a coleta de troca sem modo continuo do scanner
5. ligar auto-transmit global no mesmo padrao da ruptura

Esse corte valida o reaproveitamento certo sem forcar a troca a caber na estrutura de `prateleira` da ruptura.

## Estado apos a implementacao

O reaproveitamento proposto foi aplicado desta forma:

- compartilhado de fato:
  - lookup local de produto
  - scanner de codigo de barras
  - store transitivo do scanner
  - audio operacional
  - header de transmissao
  - badge de status
  - swipe delete
  - FAB operacional
- mantido especifico da ruptura:
  - `prateleira`
  - modal de prateleira
  - duplicidade silenciosa por `produto + prateleira`
  - evento `rupture.item.reported`
- mantido especifico da troca:
  - `motivo`
  - `quantidade`
  - `embalagem`
  - `total`
  - `add/remove`
  - validacao de saldo pendente para remocao
  - evento `exchange.item.recorded`

Risco de acoplamento evitado nesta implementacao:

- a troca nao herdou o modo continuo do scanner da ruptura
- a troca nao herdou a semantica de `prateleira`
- a ruptura nao precisou ser reescrita; ela passou apenas a consumir componentes/servicos extraidos
