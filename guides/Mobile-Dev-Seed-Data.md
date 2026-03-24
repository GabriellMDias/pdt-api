# Mobile Dev Seed Data

## Como a infraestrutura funciona

O app mobile ganhou uma infraestrutura de seed local para testes de volume nas rotinas:

- ruptura
- troca
- consumo
- producao
- balanco

O seed gera lancamentos falsos, mas coerentes com a estrutura real do SQLite local. Cada registro nasce junto com seu respectivo evento na `sync_outbox_events`, permitindo testar:

- listas grandes
- scroll e renderizacao
- busca/filtro local
- transmissao em lote

## Quais bases locais ele reutiliza

O seed nao inventa catalogos do zero. Ele usa os dados ja sincronizados no SQLite:

- `catalog_products`
- `exchange_reasons`
- `consumption_reasons`
- `production_recipes` e outputs locais
- `balance_headers`
- loja atual e usuario autenticado

## Como os dados sao gerados

- Ruptura:
  usa produtos ativos do catalogo local e gera prateleiras coerentes a partir do `shelfCode` do proprio produto ou de um codigo sintetico.
- Troca:
  usa produtos ativos + motivos de troca ativos e gera `add/remove` mantendo saldo local coerente por `motivo + produto`.
- Consumo:
  usa produtos ativos + tipos de consumo ativos e gera `add/remove` mantendo saldo local coerente por `tipo + produto`.
- Producao:
  usa as selecoes locais de receita/produto de destino e gera entradas pendentes com quantidade valida.
- Balanco:
  usa balancos locais abertos, ou qualquer balanco local disponivel quando nao houver aberto, e gera itens agrupados por balanco com saldo coerente por `balanco + produto`.

## Como os registros sao marcados para limpeza

Os eventos de seed usam `event_id` valido em UUID, igual ao fluxo real das rotinas.

Para permitir limpeza segura sem quebrar a validacao da sincronizacao, o app registra os `event_id` gerados pelo seed em `app_meta`, separados por:

- rotina
- usuario
- loja

Isso permite limpar apenas os dados de teste sem tocar nos lancamentos reais do operador. A limpeza ainda remove tambem seeds antigos que usavam o prefixo legado no `event_id`, para manter compatibilidade durante o desenvolvimento.

## Como executar em desenvolvimento

1. Entre no app com um usuario autenticado.
2. Garanta que exista uma loja atual selecionada e catalogos sincronizados.
3. Abra `Configuracoes`.
4. Entre em `Seed de volume`.
5. Escolha o volume por rotina:
   - `10`
   - `100`
   - `500`
   - `2000`
6. Gere seed por rotina individualmente ou use `Gerar todas`.

## Como limpar os dados de teste

Na mesma tela de `Seed de volume` existe:

- `Limpar seed` por rotina
- `Limpar todos os seeds`

A limpeza remove:

- os lancamentos de teste da rotina
- os eventos correspondentes na `sync_outbox_events`

Ela filtra por:

- usuario atual
- loja atual
- `event_id` registrados em `app_meta` para o seed daquela rotina
- e, por compatibilidade de desenvolvimento, seeds antigos com prefixo legado

## Protecoes contra uso em producao

O seed e protegido por tres camadas:

1. `DEV_LOCAL_SEED_ENABLED = !ENV.IS_PRODUCTION`
2. a entrada em `Configuracoes` so aparece quando o app nao esta em producao
3. a rota `/dev-seed` redireciona fora do ambiente permitido

Com isso, a feature nao aparece nem fica acessivel em builds finais de producao.

## Observacoes

- O seed depende de catalogos reais ja sincronizados. Se faltar produto, motivo, receita ou balanco, a rotina correspondente avisa isso em vez de gerar dado quebrado.
- Os seeds gerados entram como `pending` na outbox para permitir teste real de transmissao.
- Os `event_id` continuam compativeis com a API de sync, porque agora seguem o mesmo padrao UUID dos lancamentos reais.
