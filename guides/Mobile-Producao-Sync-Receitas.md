# Mobile Producao Sync Receitas

## Problema encontrado

O catalogo inicial de producao no app mobile tratava cada item vindo de `receitaproduto` como se fosse a propria receita.

Isso gerou duas distorcoes:

1. a API retornava uma linha por `receita x produto de destino`
2. o SQLite local tentava gravar isso diretamente em `production_recipes`, cuja chave era `UNIQUE (id, store_id)`

Quando uma mesma receita tinha varios produtos de destino para a mesma loja, como a receita `792`, o sync tentava inserir varias linhas com o mesmo par `(recipe_id, store_id)`.

Exemplo conceitual do erro:

- `production_recipes`
  - `(792, 1, 5691, 'FLV MIX MANGA BANANA MAMAO')`
  - `(792, 1, 5692, 'FLV MIX MANGA BANANA MAMAO')`
  - `(792, 1, 5693, 'FLV MIX MANGA BANANA MAMAO')`

O segundo insert ja violava a chave unica.

## Por que a modelagem antiga quebrava

No VRMaster:

- `receita` representa o cabecalho
- `receitaloja` define em quais lojas a receita esta ativa
- `receitaproduto` define varios produtos de destino para a mesma receita
- `receitaitem` define varios insumos de origem para a mesma receita

O modelo inicial do mobile simplificou isso para:

- `production_recipes = receita + loja + um unico product_id`

Essa simplificacao so funcionaria se cada receita tivesse um unico produto de destino por loja, o que nao e verdade no VRMaster.

## Modelagem final adotada

O app mobile passou a representar a producao em tres camadas locais:

### `production_recipes`

Cabecalho da receita por loja.

Campos principais:

- `id`
- `store_id`
- `description`
- `active_status`
- `synced_at`
- `updated_at`

Chave:

- `PRIMARY KEY (id, store_id)`

### `production_recipe_outputs`

Produtos de destino vinculados a uma receita na loja.

Campos principais:

- `recipe_output_id`
- `recipe_id`
- `store_id`
- `product_id`
- `yield_quantity`
- `synced_at`
- `updated_at`

Relacao:

- cada registro aponta para `production_recipes (id, store_id)`

### `production_recipe_inputs`

Insumos de origem vinculados a uma receita na loja.

Campos principais:

- `recipe_input_id`
- `recipe_id`
- `store_id`
- `product_id`
- `recipe_package_quantity`
- `product_package_quantity`
- `deduct_stock`
- `conversion_factor`
- `synced_at`
- `updated_at`

Relacao:

- cada registro aponta para `production_recipes (id, store_id)`

## Como receitas, lojas, origens e destinos se relacionam localmente

No mobile, a relacao final ficou assim:

- uma `receita` pode existir em varias `lojas`
- para cada `loja`, existe um cabecalho unico em `production_recipes`
- esse cabecalho pode ter varios `outputs`
- esse cabecalho pode ter varios `inputs`

Em termos praticos:

- `production_recipes` guarda o cabecalho por loja
- `production_recipe_outputs` guarda os produtos produzidos selecionaveis no modal
- `production_recipe_inputs` guarda os insumos da receita para representar corretamente a estrutura do VRMaster

## Como isso foi adaptado do VRMaster para o app mobile

O mobile continua sincronizando o catalogo por loja, porque `receitaloja` e parte essencial do filtro operacional.

Na API nova:

- o dominio `production.recipes` agora retorna um envelope por receita
- cada receita vem com `outputs` e `inputs`

No mobile:

- o sync grava primeiro o cabecalho
- depois grava as saidas
- depois grava os insumos

Na UI:

- o modal continua simples e operacional
- o usuario escolhe um produto de destino por vez
- essa lista de escolha e derivada de `recipe header + output`

Ou seja:

- a estrutura local ficou fiel ao VRMaster
- a UX continua parecida com o legado

## Como a receita 792 passa a ser representada localmente

Exemplo conceitual para a loja `1`.

### Cabecalho

`production_recipes`

- `(792, 1, 'FLV MIX MANGA BANANA MAMAO', active_status=1, ...)`

### Destinos

`production_recipe_outputs`

- `(..., 792, 1, 5691, rendimento=1, ...)`
- `(..., 792, 1, 5692, rendimento=1, ...)`
- `(..., 792, 1, 5693, rendimento=1, ...)`
- `(..., 792, 1, 5694, rendimento=1, ...)`
- `(..., 792, 1, 5695, rendimento=1, ...)`
- `(..., 792, 1, 5696, rendimento=1, ...)`

### Origens

`production_recipe_inputs`

- `(..., 792, 1, 4746, ...)`
- `(..., 792, 1, 5654, ...)`
- `(..., 792, 1, 5655, ...)`
- `(..., 792, 1, 25974, ...)`

Assim o app deixa de tentar gravar seis cabecalhos duplicados para a mesma receita/loja.

## Ajustes importantes alem do schema

### Catalogo da API

O endpoint mobile deixou de retornar uma linha por `receita x produto`.

Agora retorna:

- um item por receita
- com arrays de `outputs`
- e arrays de `inputs`

### Validacao do lancamento

O backend da producao foi corrigido para validar o par:

- `recipeId + productId + storeId`

Antes, a validacao pegava a primeira saida da receita e assumia que era unica.

### Calculo dos insumos usados

O calculo dos insumos deixou de depender apenas de `productId`.

Agora ele fica amarrado ao:

- `recipeId`
- `productId`
- `yield` da saida escolhida

Isso evita misturar receitas diferentes que por acaso produzam o mesmo item.

## Tratamento dos dados ja sincronizados

Como a producao ainda esta em fase de desenvolvimento, a base foi simplificada:

- a modelagem final ficou consolidada diretamente na migration de fundacao da producao
- a migration corretiva separada deixou de existir
- o catalogo local da producao pode ser resetado com seguranca em ambiente de desenvolvimento

Por isso o metadado de `last synced` da producao e limpo pela migration consolidada, para incentivar um novo pull completo do catalogo.

## Resumo

O erro de `UNIQUE constraint failed: production_recipes.id, production_recipes.store_id` nao era um problema de `INSERT`.

Era um problema de modelagem:

- a receita foi achatada como se tivesse uma unica saida
- mas o VRMaster trabalha com varias saidas para a mesma receita

A correcao final foi normalizar a estrutura local e alinhar o contrato de sync com o modelo real do VRMaster.
