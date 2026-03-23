# Mobile Balanco Implementacao

## Resumo

A rotina de balanco foi implementada no app novo preservando o fluxo central do legado:

1. tela principal agrupada por numero de balanco
2. tela de itens do balanco selecionado
3. tela de coleta de produtos para aquele balanco

Ao mesmo tempo, a listagem e a transmissao nasceram com estrutura melhor para volume alto.

## O que foi reaproveitado de outras rotinas

Da ruptura:

- `FeatureScreenLayout`
- `TransmissionHeader`
- `OperationalFab`
- padrao de transmissao manual com modal de progresso

Da troca e do consumo:

- `ProductLookupField`
- scanner compartilhado via `ProductBarcodeScannerScreen`
- `useProductScanStore`
- `MovementMetricField`
- `MovementTypeToggle`
- `useQuantityDecimalRevalidation`
- utilitarios de quantidade e parsing manual

Da infraestrutura comum:

- SQLite local com migrations
- outbox por evento
- `flushPendingSyncOutbox`
- loja atual via `useAuthStore`
- transmissao automatica global
- feedback sonoro de sucesso e erro

## O que foi compartilhado

Durante a implementacao foi criado:

- `TransmissionStatusChip`
  - status compacto reutilizavel para listas densas

Tambem foi reaproveitada a extracao ja existente:

- `OperationalSelectModal`
  - usada para o seletor de balanco em aberto

## O que ficou especifico do balanco

- catalogo `balance.headers`
- tabela local `balance_headers`
- tabela local `balance_entries`
- agrupamento por `balanceId`
- filtro de transmissao por `aggregateKeyPrefix`
- item de lista proprio para tela de alto volume

## Adaptacao do fluxo antigo

No legado:

- a lista agrupada vinha de agregacao sobre `logbalancoitem`
- havia tela intermediaria de itens
- a coleta era por produto, quantidade, embalagem e `Adicionar/Remover`

No app novo:

- o agrupamento continua por query sobre os lancamentos locais
- os eventos locais ficam em `balance_entries`
- cada coleta gera um evento `balance.item.recorded` na outbox
- a coleta continua com produto + quantidade + embalagem + total + `Adicionar/Remover`

## Como a listagem foi preparada para alto volume

Medidas aplicadas:

- `FlatList` com tuning basico de virtualizacao
- pagina por `limit + offset`
- contagem separada por query
- filtro local por codigo, EAN e descricao
- item visual compacto, sem `Swipeable` por linha

Isso evita o principal gargalo do legado: carregar e renderizar tudo de uma vez com linha pesada.

## Como a transmissao foi endurecida

Melhorias usadas pelo balanco:

- envio por multiplos lotes na outbox
- reconciliacao por `eventId`
- filtro opcional por `aggregateKeyPrefix`
- transmissao manual da loja inteira na tela principal
- transmissao manual de um balanco especifico na tela de itens
- auto-envio da coleta escopado ao balanco atual

## Limitacoes e refinamentos futuros

- a tela de itens ainda pode ganhar ordenacoes adicionais se aparecer necessidade operacional
- se o volume crescer muito mais, vale considerar memoizacao extra ou busca com debounce explicito
- a coleta atual ja esta pronta para scanner, mas pode receber mais atalhos de foco se houver demanda real do operador
