# Mobile Sync Performance Investigation

## Objetivo

Identificar com evidência onde o tempo da sincronização global aumentou:

- rede / request
- backend
- volume retornado
- normalização no app
- persistência local SQLite
- processamento adicional
- UI / renderização

## Etapas reais do sync hoje

### Fluxo global do mobile

1. `sync.users`
2. `bootstrap.account_stores_permissions`
3. `catalog.products`
4. `exchange.catalog.reasons`
5. `consumption.catalog.reasons`
6. `production.catalog.recipes`
7. `balance.catalog.headers`
8. `settings.current_store`

### Subetapas medidas no mobile

#### Bootstrap

- `request.account`
- `request.stores`
- `request.permissions`
- `normalize.stores`
- `normalize.permissions`
- `persist.bootstrap_snapshot`

#### Catalogos

Para cada catalogo sincronizado:

- `request.catalog_pull`
- `normalize.catalog_items`
- `persist.catalog_items`
- `persist.catalog_meta` quando existir

## Onde a instrumentação foi adicionada

### Mobile

- [initial-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/bootstrap/services/initial-sync.ts)
- [global-sync.service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/sync/services/global-sync.service.ts)
- [sync-performance.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/sync/services/sync-performance.ts)
- [product-catalog-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/shared/products/services/product-catalog-sync.ts)
- [troca-catalog-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/troca/services/troca-catalog-sync.ts)
- [consumo-catalog-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/consumo/services/consumo-catalog-sync.ts)
- [producao-catalog-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/producao/services/producao-catalog-sync.ts)
- [balanco-catalog-sync.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/balanco/services/balanco-catalog-sync.ts)

### Backend

- [mobile-sync.controller.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-sync/mobile-sync.controller.ts)

## O que passou a ser medido

### Mobile

- tempo total do `global.master_sync`
- tempo total do `bootstrap`
- tempo por request
- tempo de normalização do payload
- tempo de persistência local
- quantidade de itens por domínio

### Backend

- duração total do endpoint `POST /mobile-sync/catalog/pull`
- domínio solicitado
- loja
- quantidade de itens retornados

## Evidência inicial já disponível pelo código

Sem rodar a sincronização real nesta máquina, ainda não dá para afirmar a causa exata do aumento. Mas a auditoria já mostra duas suspeitas fortes com base estrutural:

1. `catalog.products` faz `DELETE + INSERT` completo da loja e persiste item a item em [catalog-products.repository.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/database/repositories/catalog-products.repository.ts)
2. `production.catalog.recipes` também faz replace completo e grava cabeçalho, outputs e inputs em loops separados em [production-recipes.repository.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/database/repositories/production-recipes.repository.ts)

Isso não prova sozinho o gargalo atual, mas explica por que o tempo pode crescer com volume.

## Como coletar evidência

### 1. Rodar a sync no app

1. abrir o app em uma loja real
2. iniciar a sincronização global
3. anotar em qual etapa o modal parece ficar mais tempo
4. capturar os logs do Metro / console do app

Procure por linhas como:

```text
[mobile-sync:perf] catalog.products {...}
```

### 2. Ler o banco local

Consultar `sync_runs` depois de uma sincronização:

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
WHERE scope IN (
  'global.master_sync',
  'bootstrap.account',
  'catalog.products',
  'exchange.catalog.reasons',
  'consumption.catalog.reasons',
  'production.catalog.recipes',
  'balance.catalog.headers'
)
ORDER BY id DESC
LIMIT 20;
```

### 3. Ler os logs do backend

Durante a mesma sincronização, observar os logs do Nest:

```text
{"action":"pullCatalog","domain":"stock.products","storeId":...,"itemsCount":...,"durationMs":...}
```

## Como interpretar os resultados

### Se o backend estiver lento

Sinal:

- `pullCatalog.durationMs` alto no backend
- `request.catalog_pull` alto no mobile
- `persist.catalog_items` baixo ou moderado

Conclusão:

- gargalo mais provável na query/serialização do backend ou no volume retornado

### Se o app estiver lento na persistência local

Sinal:

- `pullCatalog.durationMs` baixo/moderado no backend
- `request.catalog_pull` razoável no mobile
- `persist.catalog_items` muito alto no mobile

Conclusão:

- gargalo mais provável no SQLite local
- principal suspeita: replace completo com inserts linha a linha

### Se o volume for o principal fator

Sinal:

- `itemsCount` muito alto
- a duração cresce quase proporcionalmente ao volume
- normalmente afeta mais `catalog.products` e `production.catalog.recipes`

Conclusão:

- o sistema pode estar correto, mas a estratégia atual não escala bem para o volume atual

### Se a UI estiver atrapalhando

Sinal:

- `sync_runs` e logs mostram durações menores do que a sensação no aparelho
- o modal parece “travado” ou a interface fica pesada sem que as etapas mostrem tempo alto

Conclusão:

- suspeitar de renderização, bridge, console excessivo ou bloqueio do JS thread

## Ordem recomendada dos testes

1. executar uma sincronização de uma loja lenta
2. salvar os logs `[mobile-sync:perf]` do app
3. salvar os logs `pullCatalog` do backend
4. consultar `sync_runs` no banco local
5. comparar:
   - `request.catalog_pull` mobile
   - `durationMs` backend
   - `persist.catalog_items` mobile
6. repetir com uma loja menor ou mais rápida
7. comparar volumes e tempos

## Hipóteses ainda não confirmadas

- gargalo dominante em `catalog.products`
- gargalo secundário em `production.catalog.recipes`
- possível aumento natural por mais domínios em série
- possível impacto de payload grande no transporte do endpoint `catalog/pull`

## Como saber se o problema é API ou app

### É mais API quando

- backend demora muito
- mobile acompanha a mesma demora no request
- persistência local não domina

### É mais app quando

- backend responde rápido
- mobile demora depois do retorno
- `persist.catalog_items` domina

### É mais volume quando

- a loja lenta tem muito mais `itemsCount`
- a etapa mais lenta é sempre a mesma

## Próximos passos recomendados depois da primeira rodada

### Se confirmar gargalo em `catalog.products`

- avaliar batch insert ou statement preparado por bloco
- avaliar sync incremental por cursor em vez de replace completo
- medir custo do `DELETE` e dos inserts separadamente

### Se confirmar gargalo em `production.catalog.recipes`

- avaliar persistência em batch para outputs/inputs
- revisar necessidade de substituir tudo a cada sync

### Se não der para concluir ainda

- repetir os testes com duas lojas de volumes bem diferentes
- comparar backend e mobile no mesmo horário
- desativar temporariamente logs visuais e repetir para descartar custo de UI
