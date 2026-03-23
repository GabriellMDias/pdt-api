# Mobile Sync Progress Modal

## Como o modal funciona

O modal de sincronizacao reaproveita o `StoreSelectorModal` e troca automaticamente para modo de progresso quando `loading = true`.

Fluxo:

1. o usuario escolhe a loja
2. toca em `Sincronizar`
3. o mesmo modal entra em estado de progresso
4. a etapa atual passa a ser atualizada pelo fluxo real da sincronizacao
5. ao concluir com sucesso, o modal fecha
6. se houver erro, o loading termina e o modal continua aberto mostrando a mensagem de erro para nova tentativa ou cancelamento

## Quais etapas reais ele mostra

Para a sincronizacao global do app:

- `Usuarios`
- `Conta, lojas e permissoes`
- `Produtos`
- `Motivos de troca`
- `Tipos de consumo`
- `Receitas de producao`
- `Balancos`
- `Finalizando`

Para o preview da sincronizacao inicial na tela de login:

- `Lojas`

## Como as etapas sao atualizadas

O `runGlobalSync` agora aceita `onProgress(...)` e emite progresso real antes de cada bloco:

- `bootstrap.account_stores_permissions`
- `catalog.products`
- `exchange.catalog.reasons`
- `consumption.catalog.reasons`
- `production.catalog.recipes`
- `balance.catalog.headers`
- `settings.current_store`

No `useAuthStore`, esse progresso e salvo em:

- `syncProgressScope`
- `syncProgressLabel`
- `syncProgressDetail`

O modal consome esse estado e:

- destaca a etapa atual
- marca as etapas anteriores como concluidas
- deixa as proximas como pendentes

## Integracao com o fluxo atual

Nao houve reescrita do sistema de sync.

A integracao foi feita em cima da base existente:

- `runGlobalSync` passou a expor progresso real por etapa
- `useAuthStore` passou a armazenar o estado atual da etapa
- `StoreSelectorModal` passou a renderizar a lista de etapas e o destaque da etapa atual
- Home, Configuracoes e Login passaram a repassar esse estado para o modal

## Limitacoes atuais

- o modal mostra etapas reais, mas nao mostra percentual por item, porque esse percentual nao existe no fluxo atual
- a etapa `Conta, lojas e permissoes` agrupa mais de uma chamada do bootstrap no mesmo bloco
- o estado de erro usa a mensagem real do fluxo, mas nao faz retry automatico
