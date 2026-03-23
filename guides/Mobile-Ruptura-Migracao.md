# Mobile Ruptura Migracao

## Fontes analisadas

### Legado mobile
- `apps/mobile_old/mobile_front/app/administrativo/ruptura/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/app/administrativo/ruptura/[prateleira].tsx`
- `apps/mobile_old/mobile_front/components/ProductInput.tsx`
- `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- `apps/mobile_old/mobile_front/components/StdButton.tsx`
- `apps/mobile_old/mobile_front/components/ModalMessage.tsx`

### Legado backend
- `apps/mobile_old/mobile_backend/src/transmit/index.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/administrativo/ruptura.ts`

### App novo
- `apps/mobile/app/rupture.tsx`
- `apps/mobile/app/rupture-collect.tsx`
- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/rupture/components/rupture-collect-screen.tsx`
- `apps/mobile/src/features/rupture/components/product-lookup-input.tsx`
- `apps/mobile/src/features/rupture/components/rupture-list-item.tsx`
- `apps/mobile/src/features/rupture/components/rupture-shelf-modal.tsx`
- `apps/mobile/src/features/rupture/components/rupture-fab.tsx`
- `apps/mobile/src/features/rupture/data/rupture-db.ts`
- `apps/mobile/src/features/rupture/services/rupture-catalog-sync.ts`

## 1. Estrutura da funcionalidade antiga

### Tela principal de ruptura
- exibe ultima sincronizacao
- mostra botao `Transmitir`
- lista os registros locais em `logruptura`
- cada item mostra:
  - prateleira
  - codigo interno
  - descricao do produto
  - codigo de barras
  - status `Transmitido` ou `Nao Transmitido`
- permite remover item da lista
- possui FAB `+` no canto inferior direito
- o FAB abre modal para informar a prateleira

### Tela de coleta por prateleira
- rota `app/administrativo/ruptura/[prateleira].tsx`
- exibe botao `Salvar`
- usa `ProductInput`
- permite digitar produto, codigo de barras e codigo interno
- mostra sugestoes locais do catalogo
- possui botao de camera para leitura de codigo
- mostra a descricao do produto selecionado
- grava em `logruptura`

### Fluxo de transmissao legado
- a transmissao e manual
- o cliente agrupa por prateleira e envia para `POST /transmit/lancamentoruptura`
- o backend antigo grava em `rupturacoletor`
- se sucesso, o app marca `transmitido = 1` em `logruptura`

## 2. Fluxo completo da ruptura antiga

1. operador abre `Ruptura`
2. visualiza lista de coletas locais
3. toca em `+`
4. informa a prateleira no modal
5. entra na tela de coleta dessa prateleira
6. busca produto por descricao, EAN ou codigo interno
7. seleciona ou escaneia o produto
8. salva a coleta localmente
9. volta para a tela principal e enxerga o item na lista
10. toca em `Transmitir` para enviar o lote pendente

## 3. Componentes principais da UX antiga

- `TransmissionList`
  - responsavel pela lista de coletas com bloco de status colorido e remocao
- `ProductInput`
  - campo principal de busca
  - sugestoes locais
  - botao de camera
  - busca por descricao, barras e codigo interno
- `StdButton`
  - botao verde simples usado em `Transmitir`, `Salvar` e FAB
- `ModalMessage`
  - usado tanto para informar prateleira quanto para modal de transmissao

## 4. Diferencas entre antiga e nova

| Tema | Legado | Nova implementacao atual |
|---|---|---|
| Tela principal | lista operacional | lista operacional novamente, em vez de dashboard tecnico |
| Adicao de coleta | modal de prateleira + tela dedicada | igual ao legado, adaptado para Expo Router |
| Busca de produto | `ProductInput` com sugestoes | `ProductLookupInput` inspirado no legado |
| Camera | integrada com `expo-camera` no legado | placeholder explicito nesta etapa |
| Lista de itens | `TransmissionList` com painel de status lateral | `RuptureListItem` com composicao visual equivalente |
| Persistencia | `logruptura` local | `rupture_entries` + `sync_outbox_events` |
| Transmissao | lote manual e flag `transmitido` | outbox idempotente + push manual pelo botao `Transmitir` |
| Remocao | delete local do `logruptura` | delete local do item + evento correspondente |

## 5. Plano de migracao para deixar a nova parecida com a antiga

### Passo 1. Reorganizar a tela principal
- voltar ao modelo `lista + transmitir + FAB`
- remover o hero/dashboard tecnico da tela antiga do app novo

### Passo 2. Recriar o fluxo de prateleira
- reintroduzir modal de prateleira
- navegar para uma tela de coleta dedicada

### Passo 3. Aproximar a busca de produto do legado
- campo com sugestoes locais
- busca por descricao, barras e codigo interno
- botao de camera visivel

### Passo 4. Preservar arquitetura nova por baixo
- manter `rupture_entries`
- manter `sync_outbox_events`
- manter `event_id` unico
- manter push pelo modulo `mobile-sync`

## 6. O que pode ser reaproveitado no app novo

- persistencia local atual de `rupture_entries`
- outbox idempotente em `sync_outbox_events`
- sincronizacao do catalogo por loja
- busca local no catalogo via `searchLocalRuptureCatalog`
- push manual via `flushPendingSyncOutbox`
- shell visual do app novo e tokens de tema

## 7. O que precisa ser refeito visualmente

- tela principal de ruptura
- lista de coletas com status mais proximo do legado
- modal de prateleira
- tela de coleta dedicada
- campo de produto com sugestoes
- FAB

## 8. Dependencias tecnicas e riscos

### Dependencias
- `currentUser.id` para escopo por usuario
- `selectedStoreId` para escopo por loja
- catalogo local sincronizado para busca offline
- outbox local para transmissao e status

### Riscos
- a leitura por camera ainda nao foi portada; nesta etapa ha placeholder funcional e explicito
- a transmissao nova segue item a item por outbox, nao agrupamento literal por prateleira
- remover item enviado apaga o registro local e o receipt local do evento, mas nao desfaz o processamento ja feito no backend
- a permissao real por loja ainda depende do escopo completo da feature no backend

## Resultado esperado desta iteracao

- a tela principal da ruptura volta a lembrar claramente a versao antiga
- o fluxo `modal de prateleira -> coleta -> voltar para lista -> transmitir` fica preservado
- a UX antiga e portada, mas a base tecnica continua offline-first, com SQLite, outbox e idempotencia
