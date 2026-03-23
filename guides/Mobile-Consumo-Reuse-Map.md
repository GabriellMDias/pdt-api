# Mobile Consumo Reuse Map

## O que pode ser reaproveitado da troca

Reaproveitamento direto ou quase direto:

- estrutura de tela principal com:
  - `TransmissionHeader`
  - `OperationalFab`
  - `FlatList` de lancamentos
  - modal inicial de selecao de motivo
- fluxo de coleta com:
  - lookup de produto
  - scanner
  - campos `Quantidade`, `Embalagem` e `Total`
  - toggle `Adicionar / Remover`
  - resumo do produto selecionado
- padrao de persistencia local + outbox por evento
- uso da loja atual do app
- transmissao manual e automatica usando `autoTransmitEnabled`
- validacao de saldo pendente ao remover

Arquivos do app novo que servem como base principal:

- `apps/mobile/src/features/troca/components/troca-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-collect-screen.tsx`
- `apps/mobile/src/features/troca/data/troca-db.ts`
- `apps/mobile/src/database/migrations/010-exchange-foundation.ts`

## O que pode ser reaproveitado da ruptura

Reaproveitamento mais estrutural do que de dominio:

- padrao de tela de transmissao operacional
- fluxo de scanner e tratamento de retorno pela store
- outbox e status derivados
- feedback sonoro
- swipe para excluir

Arquivos mais relevantes:

- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/rupture/data/rupture-db.ts`
- `apps/mobile/src/features/shared/services/operational-feedback.service.ts`

Importante:

- o dominio da ruptura nao deve ser reaproveitado diretamente em consumo
- `shelfCode`, duplicidade silenciosa por prateleira e modo continuo sao especificos da ruptura

## O que ja esta compartilhado e deve ser usado por consumo

### Produtos e scanner

- `apps/mobile/src/features/shared/products/components/product-lookup-field.tsx`
- `apps/mobile/src/features/shared/products/components/product-barcode-scanner-screen.tsx`
- `apps/mobile/src/features/shared/products/data/product-catalog-db.ts`
- `apps/mobile/src/features/shared/products/store/use-product-scan-store.ts`

Esses arquivos ja centralizam:

- busca por descricao, EAN e codigo interno
- leitura por camera
- lookup local do produto
- fallback para barcode pesado
- retorno do scanner para a coleta

### Componentes operacionais

- `apps/mobile/src/features/shared/operational-entry/components/transmission-header.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/swipe-delete-card.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/operational-fab.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/transmission-status-badge.tsx`

### Infraestrutura global

- `useAuthStore` para:
  - usuario atual
  - loja atual
  - transmissao automatica global
  - conectividade e sessao
- `flushPendingSyncOutbox` para transmissao
- `mobile-sync-service` para device id, hash e conciliacao

## O que deve ser compartilhado entre consumo, troca e ruptura

### Ja compartilhado

- lookup/scanner de produto
- feedback sonoro
- header de transmissao
- FAB
- swipe delete
- status de sincronizacao
- loja atual
- parametro global de transmissao automatica

### Vale extrair antes ou durante a implementacao do consumo

Essas pecas ainda estao muito concentradas na troca:

- campo metrico visual reutilizavel para `Quantidade`, `Embalagem`, `Total` e campos somente leitura
- toggle `Adicionar / Remover`
- funcoes utilitarias:
  - parse numerico pt-BR
  - formatacao de quantidade
  - formatacao monetaria
  - normalizacao de input decimal/manual
- card/resumo do produto selecionado
- modal generico de selecao de motivo

Extracoes sugeridas:

- `features/shared/movement/components/movement-metric-field.tsx`
- `features/shared/movement/components/movement-direction-toggle.tsx`
- `features/shared/movement/components/movement-reason-modal.tsx`
- `features/shared/movement/utils/number-format.ts`
- `features/shared/movement/components/movement-product-summary.tsx`

## O que deve continuar separado

### Especifico da troca

- `exchange_reasons`
- `exchange_entries`
- evento `exchange.item.recorded`
- semantica de `troca`
- possivel uso futuro de regras ligadas a `exchangeQuantity`

### Especifico do consumo

- `consumption_reasons`
- `consumption_entries`
- evento proprio, por exemplo `consumption.item.recorded`
- processor especifico no backend
- mensagens, titulos e labels da feature

### Especifico da ruptura

- `rupture_entries`
- `shelfCode`
- duplicidade silenciosa por prateleira + produto
- fluxo continuo por scanner

## O que precisa ser refatorado antes de implementar consumo

Refactor pequeno e seguro:

- extrair o modal de motivo da troca para um modal generico de “motivo de lancamento”
- extrair o toggle `Adicionar / Remover`
- extrair os utilitarios numericos da coleta da troca

O que nao vale refatorar antes:

- transformar toda a coleta da troca em super componente generico
- unificar `troca-db` e `rupture-db` em um dominio unico artificial

Isso aumentaria risco sem retorno imediato.

## O que pode ser implementado direto sem refactor grande

Consumo pode nascer com estas bases quase prontas:

- lista principal usando o mesmo shell da troca
- modal inicial de motivo baseado na troca
- coleta baseada na troca
- scanner e busca usando `shared/products`
- transmissao usando a mesma infra de outbox e `flushPendingSyncOutbox`

Ou seja:

- refactor pequeno nos componentes compartilhaveis
- dominio novo de consumo
- sem copiar e colar a feature inteira

## Dependencias tecnicas e riscos

### Catalogo e sync

Hoje o app novo tem em `apps/mobile/src/features/mobile-sync/types.ts` apenas:

- `rupture.products`
- `stock.products`
- `exchange.reasons`

Ainda nao existe dominio de sync para consumo.

Conclusao:

- sera necessario adicionar catalogo de `consumption reasons`
- ou evoluir para um dominio generico de `movement reasons`, se isso fizer sentido tambem para troca

### Backend atual

A busca por `tipoconsumo` e `lancamentoconsumo` no backend novo nao mostrou processor mobile/sync dedicado.

Risco:

- nao basta implementar UI mobile
- sera necessario criar catalogo e processor de consumo no backend novo

### Modelo de produto

Boa noticia:

- o `catalog_products` atual ja carrega os campos que a coleta antiga de consumo precisa:
  - barcode
  - descricao
  - quantidade de embalagem
  - embalagem
  - decimal
  - preco venda
  - estoque
  - custo medio com imposto
  - peso bruto

Conclusao:

- consumo provavelmente pode reaproveitar o mesmo projection de produto usado hoje pela troca

## Sugestao de estrutura para evitar duplicacao

### Feature consumo

- `apps/mobile/src/features/consumo/components/consumo-screen.tsx`
- `apps/mobile/src/features/consumo/components/consumo-collect-screen.tsx`
- `apps/mobile/src/features/consumo/components/consumo-list-item.tsx`
- `apps/mobile/src/features/consumo/data/consumo-db.ts`
- `apps/mobile/src/features/consumo/types.ts`
- `apps/mobile/src/features/consumo/services/consumo-catalog-sync.ts`

### Shared

- `apps/mobile/src/features/shared/products/*`
- `apps/mobile/src/features/shared/operational-entry/*`
- `apps/mobile/src/features/shared/movement/*`  (novo, sugerido)

## Resumo arquitetural

Consumo deve ser implementado como:

- um novo dominio proprio
- com UX derivada da troca
- usando a mesma infra compartilhada ja consolidada
- sem reaproveitar regras de ruptura que sao especificas de prateleira
- sem copiar a troca inteira

Na pratica:

- troca e o ponto de partida funcional
- shared e a camada de reaproveitamento
- ruptura entra mais como fonte de componentes operacionais e scanner

## Estado apos implementacao

O reaproveitamento que de fato entrou foi este:

### Reaproveitado da troca

- estrutura de lista/transmissao
- fluxo de adicionar item por modal de motivo
- coleta com quantidade, embalagem, total e resumo do produto
- validacao de remocao maior que o saldo pendente
- outbox `manual/auto transmit`

### Reaproveitado da ruptura

- malha operacional de transmissao
- fluxo de scanner com retorno pela store
- feedback sonoro
- padrao de exclusao por swipe

### Extraido para compartilhamento real

- `features/shared/stock-movement/components/movement-reason-modal.tsx`
- `features/shared/stock-movement/components/movement-type-toggle.tsx`
- `features/shared/stock-movement/components/movement-metric-field.tsx`
- `features/shared/stock-movement/components/movement-list-item.tsx`
- `features/shared/stock-movement/utils.ts`

### Mantido especifico do consumo

- `consumption_reasons`
- `consumption_entries`
- evento `consumption.item.recorded`
- catalogo `consumption.reasons`
- processor/backend de consumo

### Mantido separado da ruptura

- `shelfCode`
- duplicidade silenciosa por prateleira
- fluxo continuo do scanner
