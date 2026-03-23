# Mobile Troca Implementacao

## Resumo

A rotina de troca foi implementada no app novo reaproveitando a infraestrutura offline-first ja criada para a ruptura, mas sem copiar a semantica de `prateleira` nem o fluxo de coleta continua da outra feature.

## O que foi reaproveitado da ruptura

- infraestrutura de outbox em `sync_outbox_events`
- push manual/automatico via `flushPendingSyncOutbox`
- loja atual e sessao via `useAuthStore`
- parametro global `autoTransmitEnabled`
- audio operacional de sucesso/erro
- scanner por camera com `expo-camera`
- lookup local de produto por descricao, EAN, codigo interno e barcode pesado
- header operacional de transmissao
- badge/status de transmissao
- linha swipeable para exclusao
- FAB operacional

## O que foi compartilhado entre ruptura e troca

### Produtos e scanner

- `src/features/shared/products/data/product-catalog-db.ts`
- `src/features/shared/products/components/product-lookup-field.tsx`
- `src/features/shared/products/components/product-barcode-scanner-screen.tsx`
- `src/features/shared/products/store/use-product-scan-store.ts`

### Shell operacional

- `src/features/shared/operational-entry/components/transmission-header.tsx`
- `src/features/shared/operational-entry/components/transmission-status-badge.tsx`
- `src/features/shared/operational-entry/components/swipe-delete-card.tsx`
- `src/features/shared/operational-entry/components/operational-fab.tsx`

## O que ficou especifico da troca

- `motivo de troca`
- modal de selecao de motivo
- tela de coleta com `Quantidade`, `Embalagem` e `Total`
- toggle `Adicionar / Remover`
- validacao de retirada contra saldo pendente local do mesmo produto e motivo
- evento `exchange.item.recorded`
- tabelas locais:
  - `exchange_reasons`
  - `exchange_entries`

## Como o legado foi adaptado

### Lista principal

O legado usava `logtroca` e `TransmissionList`. No app novo:

- a lista principal ficou em `troca-screen.tsx`
- os dados saem de `exchange_entries`
- o status visual vem da outbox
- a exclusao continua por swipe
- o botao `Transmitir` envia apenas eventos `exchange.*`

### Coleta

O legado usava `[idMotivoTroca].tsx`. No app novo:

- a tela `troca-collect.tsx` recebe `reasonId` e usa a loja atual do app
- a busca e o scanner usam a camada compartilhada de produto
- o operador continua escolhendo `Adicionar / Remover`
- a gravacao local gera:
  - uma linha em `exchange_entries`
  - um evento `exchange.item.recorded` na outbox

### Catalogos

O legado dependia de produto rico + `tipomotivotroca`. No app novo:

- o sync global passou a buscar:
  - `stock.products`
  - `exchange.reasons`
- `catalog_products` foi ampliado para atender a troca

## Backend novo conectado

Foi adicionada uma base inicial na API para a troca:

- `TrocaService` com catalogo mobile e processamento do evento
- processor `exchange-item-recorded`
- catalogos `stock.products` e `exchange.reasons` no `mobile-sync`

## Limites atuais e proximos refinamentos

- validar em aparelho real a densidade da coleta de troca e o scanner
- revisar com negocio se o barcode pesado deve voltar a preencher quantidade automaticamente em cenarios especificos
- expandir testes de dominio da troca na API
- migrar outras rotinas de estoque usando a mesma camada compartilhada extraida aqui
