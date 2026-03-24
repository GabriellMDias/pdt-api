# Mobile Stock Movement Legacy Audit

## Escopo auditado

Objetivo desta auditoria:

- localizar no legado onde a movimentacao real de estoque acontecia
- identificar como `troca`, `consumo` e `producao` reutilizavam essa logica
- mapear como o legado tratava:
  - estoque congelado
  - produto associado para estoque
  - custo
  - `logtransacao`
  - diferencas entre as rotinas

Arquivos principais revisados no legado:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/troca.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/consumo.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/products.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/logTransacao.ts`
- `apps/mobile_old/mobile_backend/src/transmit/index.ts`

Observacao importante:

- a logica de negocio relevante estava no backend legado, nao no mobile front
- o mobile antigo principalmente capturava dados e transmitia
- quem decidia como atualizar estoque era o backend legado

## Nucleo compartilhado encontrado

O legado ja tinha um nucleo compartilhado para movimentacao de estoque em:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`

Esse arquivo concentrava as funcoes mais importantes:

- `isStockFrozen(idStore)`
- `calcAssociatedQuantity(params, quantity)`
- `insertStockFrozen(params)`
- `updateStock(params)`
- `updateCost(params)`
- `generateStockMovement(params)`

Na pratica, `troca`, `consumo` e `producao` nao reimplementavam toda a regra. Elas montavam os parametros da rotina e chamavam `generateStockMovement(...)`.

## Estoque congelado no legado

### Como o status era detectado

Funcao:

- `isStockFrozen(idStore)`

Consulta usada:

- `parametrovalor`
- `parametro`
- filtro por `p.descricao = 'Estoque Congelado'`
- filtro por loja

Interpretacao observada:

- se o parametro da loja estivesse ligado, o backend considerava o estoque congelado
- essa decisao era tomada no momento de executar a movimentacao

### Como o legado se comportava quando o estoque estava congelado

Se o estoque estivesse congelado e o produto estivesse ativo:

- nao atualizava `produtocomplemento.estoque`
- nao inseria `logestoque`
- inseria em `estoquecongelado`

Funcao usada:

- `insertStockFrozen(params)`

Campos relevantes gravados:

- `id_produto`
- `id_loja`
- `id_tipomovimentacao`
- `quantidade`
- `id_estoquecongeladotipoentradasaida`
- `custocomimposto = 0`
- `customediocomimposto = 0`
- `custosemimposto = 0`
- `customediosemimposto = 0`
- `baixareceita = false`
- `baixaassociado = true`
- `baixaperda = false`

Conclusao funcional:

- o legado nao descartava a movimentacao
- ele apenas trocava o destino da gravacao:
  - direto no estoque quando liberado
  - `estoquecongelado` quando congelado

Ponto de atencao:

- os flags de `estoquecongelado` no legado sao rigidos
- `baixareceita`, `baixaassociado` e `baixaperda` nao eram parametrizados por rotina no nucleo encontrado
- isso sugere um comportamento pratico que funcionava, mas nao uma modelagem especialmente flexivel

## Produto associado no legado

### O que foi encontrado

A resolucao de produto associado para estoque estava centralizada em:

- `apps/mobile_old/mobile_backend/src/database/queries/products.ts`

Funcao:

- `getAssociatedStockProductInfo(idProduct)`

Consulta usada:

- `associado ass`
- `associadoitem ai`
- filtro `ai.aplicaestoque = 't'`
- filtro `ass.id_produto = $1`

Campos retornados:

- `qtdembalagem_pri`
- `id_produto_ass`
- `qtdembalagem_ass`
- `percentualcustoestoque_ass`

### Como a quantidade realmente movimentada era calculada

No legado, a funcao `calcAssociatedQuantity(...)` fazia:

- `quantidade * (qtdembalagem_pri / qtdembalagem_ass)`
- mais o adicional percentual de `percentualcustoestoque_ass`

Formula observada no codigo:

- `quantidade_movimentada = (quantidade * (qtdembalagem_pri / qtdembalagem_ass)) + ((percentualcustoestoque_ass / 100) * quantidade * (qtdembalagem_pri / qtdembalagem_ass))`

Interpretacao:

- se o produto principal nao tiver estoque proprio, a movimentacao de estoque vai para o produto associado
- a quantidade nao e necessariamente 1:1
- ela depende:
  - da relacao de embalagem entre principal e associado
  - do percentual adicional configurado

### O que nao foi encontrado

Nao encontrei no backend legado uma camada compartilhada equivalente para:

- `aplicacusto = true`
- propagacao de custo por associado

Ou seja:

- a associacao de estoque estava claramente centralizada
- a associacao de custo nao apareceu como um resolver compartilhado explicito no legado auditado

Isso e importante para a arquitetura nova:

- nao vale assumir que "produto associado" era uma regra unica no legado
- pelo codigo encontrado, estoque e custo precisam ser tratados como responsabilidades separadas

## `logtransacao` no legado

Funcao centralizada:

- `apps/mobile_old/mobile_backend/src/database/queries/logTransacao.ts`
- `insertLogTransacao(params)`

Parametros usados:

- `idStore`
- `idProduct`
- `idForm`
- `idTransactionType`
- `idUser`
- `ipTerminal`

Comportamento:

- le a versao do VR por `getVRVersion()`
- insere uma linha em `logtransacao`

Conclusao:

- o legado nao duplicava o `INSERT INTO logtransacao` em cada rotina
- isso ja era um bom indutor de arquitetura compartilhada

## Como o nucleo compartilhado decidia a movimentacao

Em `generateStockMovement(params)`, o fluxo observado foi:

1. verificar se o estoque da loja esta congelado
2. verificar se o produto tem associado de estoque
3. resolver qual produto realmente deve ser movimentado
4. calcular a quantidade real, inclusive conversao por embalagem e percentual
5. carregar parametros atuais do produto alvo:
   - estoque
   - custos
   - custos medios
   - status de cadastro
6. se `updateCost = true`, calcular novo custo medio e chamar `updateCost(...)`
7. se estoque congelado:
   - inserir em `estoquecongelado`
8. senao:
   - inserir `logestoque`
   - atualizar `produtocomplemento.estoque`

Esse ponto e a principal evidencia de que o legado tinha um executor compartilhado de movimentacao.

## Diferencas entre as rotinas no legado

## Troca

Arquivo:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/troca.ts`

Parametros da movimentacao:

- `idMovementType = 18`
- `idInOrOut = 1`
- `updateCost = false`

Parametros de `logtransacao`:

- `idForm = 196`
- `idTransactionType = 1`

Fluxo observado:

1. `BEGIN`
2. `generateStockMovement(...)`
3. `insertLogTransacao(...)`
4. `insertTroca(...)`
5. `COMMIT`

Comportamento especifico da troca:

- alem do estoque normal, atualiza tambem `produtocomplemento.troca`
- registra `logtroca`
- a observacao antiga deixava claro que o estoque da troca continuava sendo do produto principal, mesmo que houvesse associado para o estoque operacional

## Consumo

Arquivo:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/consumo.ts`

Parametros da movimentacao:

- `idMovementType = 11`
- `idInOrOut = 1`
- `updateCost = false`

Parametros de `logtransacao`:

- `idForm = 9`
- `idTransactionType = 1`

Fluxo observado:

1. `BEGIN`
2. `generateStockMovement(...)`
3. `insertLogTransacao(...)`
4. `insertConsumo(...)`
5. `COMMIT`

Comportamento especifico do consumo:

- agrega o consumo do dia por:
  - loja
  - produto
  - tipo de consumo
- preserva varios campos fiscais e de custo na tabela `consumo`
- a movimentacao de estoque continua vindo do nucleo compartilhado

## Producao

Arquivo:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`

Parametros da movimentacao dos insumos:

- `idMovementType = 23`
- `idInOrOut = 1`
- `updateCost = false`

Parametros da movimentacao do produto produzido:

- `idMovementType = 23`
- `idInOrOut = 0`
- `updateCost = true`

Parametros de `logtransacao`:

- `idForm = 85`
- `idTransactionType = 0`

Fluxo funcional observado:

1. validar se o produto produzido esta ativo
2. buscar os itens da receita
3. baixar os insumos com `generateStockMovement(...)`
4. somar custos usados
5. lancar entrada do produto produzido com `generateStockMovement(...)`
6. registrar `logtransacao` do produto produzido
7. inserir `producao` e `producaoitem`

Diferenca estrutural importante:

- producao usa o mesmo nucleo compartilhado, mas de forma composta
- ela faz varios movimentos dentro da mesma rotina:
  - varias saidas de insumos
  - uma entrada de produto acabado

## Fragilidade importante encontrada no legado

Na producao, os itens da receita eram processados com:

- `recipeItems.map(async (recipeItem) => { await generateStockMovement(...) })`

Sem `await Promise.all(...)` e sem serializacao explicita antes do `BEGIN/COMMIT` final da rotina.

Risco implicito:

- as baixas dos insumos podiam escapar da atomicidade esperada
- a ordem operacional da producao no legado nao era tao robusta quanto parecia

Isso e um ponto de melhoria claro para a arquitetura nova.

## Diferencas funcionais consolidadas

Aspectos compartilhados entre `troca`, `consumo` e `producao` no legado:

- todas usam o mesmo nucleo para:
  - verificar estoque congelado
  - resolver associado de estoque
  - calcular quantidade real movimentada
  - escrever em `estoquecongelado` ou `logestoque`
  - atualizar `produtocomplemento.estoque`
- todas registram `logtransacao`

Aspectos especificos por rotina:

- `troca`
  - atualiza `troca`
  - escreve `logtroca`
  - tipo de movimento 18
- `consumo`
  - faz `insert/update` em `consumo`
  - preserva tributacao e custos do item
  - tipo de movimento 11
- `producao`
  - gera um conjunto de movimentos
  - atualiza custo do item produzido
  - escreve `producao` e `producaoitem`
  - tipo de movimento 23

## Leitura final do legado

O legado nao era tres implementacoes completamente separadas.

Ele ja tinha uma direcao correta:

- camada compartilhada para movimentacao de estoque
- camada compartilhada para `logtransacao`
- rotinas informando apenas os parametros e a persistencia especifica do dominio

Ao mesmo tempo, ele deixava lacunas:

- associacao de custo nao apareceu centralizada
- flags de `estoquecongelado` eram pouco flexiveis
- producao tinha fragilidade transacional

Esses pontos devem orientar a arquitetura nova:

- preservar o que ja era centralizado
- endurecer a parte transacional
- separar resolucao de estoque associado da propagacao de custo associado
