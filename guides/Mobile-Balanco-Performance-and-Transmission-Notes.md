# Mobile Balanco Performance and Transmission Notes

## Causas provaveis da lentidao antiga

Com base no legado analisado, a lentidao da tela de itens do balanco vinha da combinacao de varios fatores.

### 1. Consulta sem filtro local e sem limite

Na tela `apps/mobile_old/mobile_front/app/estoque/balanco/[idBalanco].tsx`:

- a consulta busca todos os itens de `logbalancoitem` daquele balanco
- nao ha busca local por codigo ou descricao
- nao ha `LIMIT`
- nao ha paginacao

Resultado:

- quanto maior o balanco, maior o array carregado de uma vez

### 2. Linha visual pesada por item

O componente `apps/mobile_old/mobile_front/components/TransmissionList.tsx` usa:

- `GestureHandlerRootView` por item
- `Swipeable` por item
- estrutura de card alta, com `height: 150`
- varias `View` e `Text` por linha

Resultado:

- custo alto de renderizacao
- custo alto de layout
- custo alto de gesto, especialmente com muitos itens

### 3. Falta de tuning de virtualizacao

Embora o legado use `FlatList`, ele nao usa:

- `keyExtractor`
- `initialNumToRender`
- `maxToRenderPerBatch`
- `windowSize`
- `getItemLayout`
- memoizacao de linha

Resultado:

- a virtualizacao existe, mas sem otimizar o caso de volume alto

### 4. Ausencia de filtro local

O usuario nao tinha filtro por:

- codigo interno
- codigo de barras
- descricao

Resultado:

- precisava navegar visualmente por listas grandes
- mais itens renderizados do que o necessario para achar algo especifico

### 5. Atualizacao integral da tela

Apos excluir ou transmitir:

- a tela refaz a consulta completa
- recarrega a lista inteira

Resultado:

- custo crescente conforme o volume aumenta

## Proposta para listagem em alto volume

### Estrutura de telas

Separar claramente:

1. Tela agrupada por numero de balanco
2. Tela de itens do balanco selecionado
3. Tela de coleta

### Tela de itens do balanco

Ela deve nascer com:

- `FlatList` real
- item compacto e memoizado
- `keyExtractor` estavel por `eventId` ou `localId`
- `initialNumToRender`, `windowSize` e `maxToRenderPerBatch` ajustados
- sem usar um card visual pesado quando nao for necessario

Sugestao pratica:

- na tela de itens, preferir um row compacto proprio do balanco
- manter swipe para excluir, mas sem a estrutura mais cara usada pelo legado

### Consulta local

Em vez de carregar tudo e filtrar em JavaScript:

- a query local deve aceitar:
  - `balanceId`
  - `search`
  - `limit`
  - `offset` ou cursor

Filtro sugerido:

- codigo interno
- codigo de barras
- descricao do produto

## Proposta para filtro local

### Comportamento desejado

- campo de busca na tela de itens do balanco
- filtro por codigo e descricao
- resposta rapida, local, sem depender de rede

### Implementacao sugerida

- debounce curto no texto digitado
- aplicar o filtro ja na query SQLite

Exemplo conceitual de clausulas:

- `product_id LIKE`
- `barcode LIKE`
- `product_description LIKE`

Importante:

- o filtro deve ser sempre escopado ao `balanceId`
- nao faz sentido pesquisar em todos os balancos ao mesmo tempo na tela de itens

### Indexacao

Para evitar degradação com volume:

- indice por `balance_id`
- indice por `balance_id + product_id`
- se o schema final armazenar `barcode`, indice por `balance_id + barcode`

## Proposta para transmissao robusta em alto volume

## O que vale preservar do legado

- idempotencia
- ordenacao estavel
- processamento em lotes
- marcacao parcial de sucesso

## O que vale modernizar na base nova

Em vez de repetir o agrupamento manual do legado:

- cada coleta local deve virar um evento proprio na outbox
- exemplo de evento:
  - `balance.item.recorded`

Vantagens:

- evita conciliacao fragil por produto
- evita ambiguidade ao marcar sucesso parcial
- fica alinhado com troca, consumo e producao

### Chave agregada sugerida

Para preservar a possibilidade de transmissao por balanco:

- `aggregateKey = balance:{balanceId}:entry:{eventId}`

Com isso, se necessario, a infraestrutura de outbox pode evoluir para filtrar:

- por `eventTypePrefix`
- por `storeId`
- por `aggregateKeyPrefix`

Isso e relevante porque hoje a `flushPendingSyncOutbox` filtra por:

- usuario
- loja
- prefixo do tipo de evento

Mas nao por um balanco especifico.

## Riscos e mitigacoes

### Risco 1: usar o mesmo card pesado das outras rotinas

Problema:

- a lista de itens do balanco pode ter volume bem maior que troca, consumo e producao

Mitigacao:

- item de lista especifico do balanco
- menos altura
- menos texto por linha
- memoizacao

### Risco 2: filtro feito so em memoria

Problema:

- continua carregando tudo antes de filtrar

Mitigacao:

- filtrar na query SQLite
- usar paginação ou carregamento incremental

### Risco 3: transmissao apenas por loja

Problema:

- a tela de um balanco especifico pode transmitir eventos de outros balancos da mesma loja se a outbox nao tiver filtro adicional

Mitigacao:

- decidir conscientemente entre:
  - transmitir tudo da loja
  - ou extender a outbox para permitir transmissao so do balanco atual

### Risco 4: refresh integral apos cada operacao

Problema:

- exclusao e transmissao podem forcar recarga completa da lista grande

Mitigacao:

- refresh por query escopada ao balanco atual
- atualizacao otimista local quando seguro

## Direcao recomendada para o app novo

Para o balanco nascer melhor do que o legado sem descaracterizar a rotina:

- manter a tela inicial agrupada por numero de balanco
- manter a tela de itens do balanco
- manter a tela de coleta por produto
- preparar a tela de itens para alto volume desde o primeiro corte
- usar filtro local por codigo e descricao
- usar outbox por evento com possibilidade de filtro por balanco

Essa combinacao preserva o fluxo operacional antigo e elimina os gargalos mais provaveis observados no legado.

## Implementacao aplicada no app novo

### Listagem de alto volume

A tela `balanco-items-screen.tsx` foi implementada com:

- `FlatList` nativa
- `initialNumToRender`
- `maxToRenderPerBatch`
- `windowSize`
- `removeClippedSubviews`
- carregamento incremental por pagina

Consulta local aplicada:

- `listBalanceEntriesByBalance`
  - recebe `balanceId`
  - recebe `search`
  - recebe `limit`
  - recebe `offset`
- `countBalanceEntriesByBalance`
  - calcula o total filtrado sem carregar tudo em memoria

Filtro local implementado:

- por `product_id`
- por `barcode`
- por `product_description`

### Estrategia de item visual

Em vez de reutilizar o card grande com `Swipeable` de outras rotinas:

- foi criado um item compacto proprio do balanco
- a exclusao individual ficou por botao, nao por swipe
- isso reduz custo de gesto/layout por linha

### Transmissao robusta

O balanco usa o modelo mais forte da base atual:

- um evento por coleta na outbox
- `eventType = balance.item.recorded`
- `aggregateKey = balance:{balanceId}:entry:{eventId}`
- `flushPendingSyncOutbox` em multiplos lotes
- filtro adicional por `aggregateKeyPrefix` na tela de itens e no auto-envio da coleta

Protecao contra duplicacao e inconsistencias:

- se a API processar e a resposta nao voltar ao app, o reenvio usa o mesmo `eventId`
- a API responde `duplicate`
- o mobile reconcilia o evento como sucesso/conciliado
- isso evita o problema legado de item processado no servidor mas ainda pendente localmente
