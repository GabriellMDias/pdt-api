# Mobile Producao Receita x Produto - Transmission Fix

## Problema

Ao transmitir um lancamento de producao valido, a API podia responder:

- `Produto informado nao corresponde a receita enviada pelo mobile.`

Esse erro era falso para casos validos.

## Causa raiz

O problema estava no backend novo, em `apps/api/src/adm/producao/producao.service.ts`.

A query que validava a dupla `recipeId + productId` retornava:

- `rp.id_produto`

Mas o codigo lia o resultado como:

- `recipe.product_id`

Sem alias explicito, o PostgreSQL devolve a coluna como `id_produto`, nao `product_id`.

Na pratica:

- a receita era encontrada
- `recipe.product_id` ficava `undefined`
- `Number(undefined)` virava `NaN`
- a validacao caia falsamente no erro de mismatch

## Como o legado tratava isso

No legado, a transmissao de producao era orientada por `idProduto`.

O mobile antigo transmitia o produto produzido e o backend antigo derivava a receita a partir dele. Por isso esse mismatch nao aparecia no fluxo antigo.

Arquivos de referencia do legado:

- `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`

## Como ficou no projeto novo

O contrato novo continua usando:

- `recipeId`
- `productId`

Isso foi mantido, porque ele suporta corretamente o caso em que uma receita possui mais de um produto de destino.

## Correcao aplicada

1. A query passou a usar alias explicito:

- `rp.id_produto AS product_id`

2. A leitura do resultado ficou defensiva:

- primeiro tenta `product_id`
- se necessario, aceita `id_produto`

Assim a validacao volta a funcionar corretamente mesmo se houver variacao de naming no row mapping.

## Resultado esperado

Agora:

- um lancamento valido com `recipeId + productId` coerentes transmite sem erro falso
- um caso realmente invalido continua sendo bloqueado

## Como validar

1. Gere um lancamento de producao valido no mobile.
2. Transmita o item.
3. Confirme que o erro de mismatch nao aparece mais.
4. Se quiser validar regressao automatizada, rode:

```bash
cd apps/api
npx jest src/adm/producao/producao.service.spec.ts --runInBand
```

Os testes cobrem:

- caso valido com row usando `id_produto`
- caso valido com custo calculado normalmente
- caso invalido com produto realmente diferente da receita
