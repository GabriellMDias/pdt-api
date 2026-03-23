# Mobile Sync Diagnostico de Performance

## O que mudou na instrumentacao

A sincronizacao global do app agora expõe a etapa atual no modal e grava no `sync_runs.response_payload_json` a duracao de cada bloco principal:

- `bootstrap.account_stores_permissions`
- `catalog.products`
- `exchange.catalog.reasons`
- `consumption.catalog.reasons`
- `production.catalog.recipes`
- `balance.catalog.headers`
- `settings.current_store`

No app novo, a tendencia natural de aumento do tempo existe porque a sincronizacao global hoje faz mais trabalho do que no inicio do projeto:

- sincroniza usuarios antes do pull global
- prepara conta, lojas e permissoes
- baixa catalogo de produtos
- baixa motivos de troca
- baixa tipos de consumo
- baixa receitas de producao
- baixa balancos em aberto
- grava tudo localmente

O ponto com maior chance de crescer com volume e `catalog.products`, porque ele substitui o catalogo local da loja inteira.

## Como testar sem ficar no escuro

1. Rode uma sincronizacao completa no app com a loja que esta lenta.
2. Observe no modal qual etapa fica mais tempo parada.
3. Depois da sincronizacao, inspecione a ultima linha de `sync_runs` com `scope = 'global.master_sync'`.
4. Leia `response_payload_json` e compare `durationMs` por etapa.
5. Se o gargalo estiver em `catalog.products`, compare tambem o volume de itens retornados e o tempo de escrita local.
6. Se o gargalo estiver em `bootstrap.account_stores_permissions`, compare separadamente conta, lojas e permissoes no backend.
7. Se o gargalo estiver em `production.catalog.recipes` ou `balance.catalog.headers`, valide volume por loja e payload retornado.

## Consulta util para o banco local

```sql
SELECT
  id,
  scope,
  status,
  started_at,
  finished_at,
  response_payload_json,
  error_message
FROM sync_runs
WHERE scope = 'global.master_sync'
ORDER BY id DESC
LIMIT 5;
```

## O que observar no JSON

- `scopes[].scope`: qual bloco foi executado
- `scopes[].itemsCount`: quantos itens vieram naquele bloco
- `scopes[].durationMs`: quanto tempo aquele bloco levou
- `metrics[]`: lista detalhada com inicio/fim e duracao por etapa

## Prompts prontos para investigar com o Codex

### 1. Descobrir o gargalo principal

```text
Analise este response_payload_json da ultima sync global do mobile e me diga qual etapa esta mais lenta, comparando durationMs, itemsCount e possiveis causas no codigo.
```

### 2. Se o problema parecer no catalogo de produtos

```text
O gargalo parece estar em catalog.products. Revise no app mobile a rotina syncProductCatalog, replaceCatalogProductsForStore e o schema catalog_products e me diga se o tempo maior tende a vir da API, da serializacao ou da escrita SQLite.
```

### 3. Se o problema parecer no bootstrap

```text
O gargalo parece estar em bootstrap.account_stores_permissions. Revise runInitialSync, fetchCurrentAccount, fetchStoresCatalog e fetchUserPermissionScopes e me diga qual parte provavelmente esta dominando o tempo e como validar isso.
```

### 4. Se o problema parecer em producao ou balanco

```text
O gargalo da sync global parece estar em production.catalog.recipes ou balance.catalog.headers. Revise os services de sync dessas rotinas e me diga se o custo maior tende a estar no volume retornado pela API, na normalizacao do payload ou na escrita local.
```

### 5. Para comparar lojas diferentes

```text
Compare estes dois response_payload_json de sync global, um da loja rapida e outro da loja lenta, e me diga em qual etapa os tempos divergem mais e qual hipotese operacional isso sugere.
```

## Se precisar isolar backend vs mobile

1. Meça no app quanto tempo total a sincronizacao leva.
2. Compare com o `durationMs` somado das etapas locais.
3. Se o tempo no aparelho for muito maior que o total registrado nas etapas, suspeite de:
   - renderizacao/UI
   - latencia de rede antes da resposta
   - bloqueio do JavaScript thread
4. Se uma etapa especifica dominar o JSON, investigue primeiro aquela etapa.

## Hipoteses mais provaveis hoje

- crescimento do volume de `catalog.products`
- mais dominios sendo sincronizados em serie
- receitas de producao mais pesadas que os catalogos pequenos
- custo de `DELETE + INSERT` completo no SQLite por loja

## Proximo passo recomendado

Se voce me trouxer o `response_payload_json` da ultima linha de `sync_runs` da loja lenta, eu consigo apontar com bem mais precisao se a demora esta em:

- bootstrap
- produtos
- troca
- consumo
- producao
- balancos
- ou no fechamento final da sync
