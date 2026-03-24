# Mobile Stock Movement Validation

## Objetivo

Validar a confiabilidade da camada compartilhada de movimentacao de estoque implementada em:

- `apps/api/src/stock-movement`

Escopo principal:

- estoque congelado
- produto associado
- calculo da quantidade realmente movimentada
- centralizacao de `logtransacao`
- uso compartilhado por `troca`, `consumo` e `producao`

## Cenarios automatizados cobertos

## 1. Estoque nao congelado

Cobertura:

- `apps/api/src/stock-movement/stock-movement.service.spec.ts`

Validacao:

- movimenta estoque normalmente
- grava `logestoque`
- atualiza `produtocomplemento.estoque`
- retorna `stockApplied = true`

## 2. Estoque congelado

Cobertura:

- `apps/api/src/stock-movement/stock-movement.service.spec.ts`

Validacao:

- nao atualiza o estoque diretamente
- nao grava `logestoque`
- grava em `estoquecongelado`
- retorna `stockFrozen = true`
- retorna `stockApplied = false`

## 3. Produto sem associado

Cobertura:

- `apps/api/src/stock-movement/stock-movement.service.spec.ts`

Validacao:

- movimenta o proprio produto
- usa a quantidade original

## 4. Produto com associado de estoque

Cobertura:

- `apps/api/src/stock-movement/stock-movement.service.spec.ts`
- `apps/api/src/stock-movement/product-association-resolver.service.spec.ts`

Validacao:

- resolve o produto de destino correto
- usa a quantidade ajustada pela regra de associado
- grava a movimentacao no produto realmente afetado

## 5. Produto com percentual diferente de zero

Cobertura:

- `apps/api/src/stock-movement/product-association-resolver.service.spec.ts`
- `apps/api/src/stock-movement/stock-movement-formulas.spec.ts`

Validacao:

- aplica corretamente o percentual em conjunto com a conversao por embalagem

Exemplo coberto:

- origem `10`
- embalagem `1/1`
- percentual `50`
- resultado `15`

## 6. Centralizacao de `logtransacao`

Cobertura:

- `apps/api/src/stock-movement/transaction-log.service.spec.ts`

Validacao:

- usa um ponto unico para inserir `logtransacao`
- normaliza `ipterminal`
- usa `referenceId` explicito quando informado
- usa `productId` como fallback quando `referenceId` nao vem

## Exemplos reais de negocio para validar

## Exemplo 1. Associado de estoque

Caso conceitual:

- produto original: `3639`
- produto realmente movimentado: `191`
- percentual: `50`
- quantidade original: `10`

Resultado esperado:

- quantidade movimentada real: `15`
- `logestoque` e `produtocomplemento.estoque` do item `191`

## Exemplo 2. Conversao por embalagem

Caso conceitual:

- quantidade original: `10`
- `associado.qtdembalagem = 7`
- `associadoitem.qtdembalagem = 2`
- percentual `0`

Resultado esperado:

- quantidade movimentada real: `35`

## Exemplo 3. Propagacao de custo

Caso conceitual:

- custo base: `100`
- `associado.qtdembalagem = 5`
- `associadoitem.qtdembalagem = 2`
- percentual `50`

Resultado esperado:

- custo associado: `60`

## Como validar manualmente

## Validacao 1. Estoque congelado em ambiente real

Passos:

1. ligar o parametro `Estoque Congelado` na loja de teste
2. transmitir um lancamento de:
   - troca
   - consumo
   - producao
3. consultar:
   - `estoquecongelado`
   - `produtocomplemento`
   - `logestoque`

Resultado esperado:

- deve existir linha em `estoquecongelado`
- nao deve haver alteracao direta no `estoque` do produto movimentado
- dependendo do caso, custo ainda pode ser atualizado se a rotina pedir `updateCost`

Consultas uteis:

```sql
select * from estoquecongelado where id_loja = :loja order by data desc;
select estoque, custosemimposto, custocomimposto from produtocomplemento where id_loja = :loja and id_produto = :produto;
select * from logestoque where id_loja = :loja and id_produto = :produto order by datahora desc;
```

## Validacao 2. Produto associado de estoque

Passos:

1. preparar um produto com `aplicaestoque = true`
2. transmitir um lancamento da rotina usando o produto original
3. consultar:
   - `logestoque`
   - `produtocomplemento.estoque`

Resultado esperado:

- o produto efetivamente movimentado deve ser o associado
- a quantidade deve refletir:
  - embalagem
  - percentual

## Validacao 3. `logtransacao`

Passos:

1. transmitir um lancamento de cada rotina:
   - troca
   - consumo
   - producao
2. consultar `logtransacao`

Resultado esperado:

- deve existir uma linha por rotina processada
- `id_formulario` esperado:
  - troca: `196`
  - consumo: `9`
  - producao: `85`
- `ipterminal` deve vir normalizado como `/MOBILE-SYNC`

Consulta util:

```sql
select id_loja, referencia, id_formulario, id_tipotransacao, ipterminal, versao, id_referencia
from logtransacao
where id_loja = :loja
order by datahora desc;
```

## Validacao 4. Producao com custo

Passos:

1. transmitir uma producao de teste
2. consultar:
   - `logcusto`
   - `produtocomplemento`
   - `producao`

Resultado esperado:

- o item produzido deve ter custo atualizado
- `logcusto` deve registrar anterior e novo custo
- a tabela `producao` deve refletir o custo final usado

## Riscos ainda existentes

## 1. Validacao com dados reais de associado para custo

O calculo de custo associado foi implementado conforme a regra funcional informada, mas ainda depende de validacao com casos reais do VRMaster.

Risco:

- existir alguma excecao operacional nao visivel apenas pelo legado auditado

## 2. Flags de `estoquecongelado`

Os campos:

- `baixareceita`
- `baixaassociado`
- `baixaperda`

foram mantidos no padrao observado no legado.

Risco:

- alguma rotina futura precisar parametrizar isso de forma diferente

## 3. Validacao ponta a ponta com mobile sync

Os testes automatizados cobrem a camada compartilhada diretamente.

Ainda vale validar ponta a ponta:

- mobile gera evento
- processor recebe
- rotina usa a camada compartilhada
- banco final reflete o resultado esperado

## Proximos pontos de atencao

### 1. Adicionar testes de integracao por rotina

Depois da validacao inicial, vale adicionar testes de integracao para:

- `TrocaService.registerMobileEntry`
- `ConsumoService.registerMobileEntry`
- `ProducaoService.registerMobileEntry`

Meta:

- provar que as rotinas continuam delegando para a camada compartilhada

### 2. Validar producao com associado e estoque congelado simultaneamente

Esse e o cenario mais sensivel da camada nova.

Meta:

- garantir que os insumos e o item produzido se comportem corretamente quando houver:
  - associado
  - custo
  - congelamento

### 3. Revisar com dados reais de loja

Especialmente para:

- `associado`
- `associadoitem`
- `estoquecongelado`

porque a confiabilidade final depende da aderencia ao VRMaster real, nao so da regra codificada.
