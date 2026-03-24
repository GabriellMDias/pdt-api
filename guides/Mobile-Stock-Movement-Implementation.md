# Mobile Stock Movement Implementation

## O que foi implementado

A API nova ganhou uma camada compartilhada para movimentacao de estoque em:

- `apps/api/src/stock-movement/stock-movement.module.ts`
- `apps/api/src/stock-movement/stock-movement.service.ts`
- `apps/api/src/stock-movement/stock-freeze-resolver.service.ts`
- `apps/api/src/stock-movement/product-association-resolver.service.ts`
- `apps/api/src/stock-movement/transaction-log.service.ts`
- `apps/api/src/stock-movement/stock-movement-formulas.ts`

Tambem foi adicionado teste de formula em:

- `apps/api/src/stock-movement/stock-movement-formulas.spec.ts`

## Servicos e funcoes compartilhadas criados

### `StockMovementService`

Servico central que executa a movimentacao compartilhada.

Responsabilidades:

- validar a quantidade da movimentacao
- resolver associado de estoque
- descobrir o produto realmente movimentado
- calcular a quantidade real movimentada
- atualizar custo quando a rotina pedir
- propagar custo para associados com `aplicacusto = true`
- decidir entre:
  - atualizar `produtocomplemento.estoque`
  - ou inserir em `estoquecongelado`
- escrever `logestoque`
- escrever `logcusto`
- atualizar custos e estoque em `produtocomplemento`

### `StockFreezeResolverService`

Responsavel por consultar o parametro da loja:

- `parametrovalor`
- `parametro`
- `descricao = 'Estoque Congelado'`

Retorna se a loja esta ou nao com estoque congelado.

### `ProductAssociationResolverService`

Responsavel por:

- resolver associado de estoque via `associado` e `associadoitem`
- calcular a quantidade real movimentada
- listar associados de custo com `aplicacusto = true`
- calcular o custo propagado para os associados

### `TransactionLogService`

Responsavel por centralizar o `INSERT INTO logtransacao`.

Agora `troca`, `consumo` e `producao` nao montam mais o SQL inline de `logtransacao`.

## Como estoque congelado foi tratado

O comportamento implementado segue a direcao do legado:

- se a loja nao estiver com estoque congelado:
  - a rotina grava `logestoque`
  - e atualiza `produtocomplemento.estoque`
- se a loja estiver com estoque congelado:
  - nao atualiza o estoque diretamente
  - insere em `estoquecongelado`

Campos usados em `estoquecongelado`:

- `id_produto`
- `id_loja`
- `id_tipomovimentacao`
- `quantidade`
- `id_estoquecongeladotipoentradasaida`

Flags aplicadas por padrao, iguais ao comportamento legado observado:

- `baixareceita = false`
- `baixaassociado = true`
- `baixaperda = false`

Observacao importante:

- a atualizacao de custo continua independente da decisao de estoque congelado
- isso preserva a ordem funcional do legado na producao, onde `updateCost` acontecia antes da decisao entre estoque direto e `estoquecongelado`

## Como produto associado foi tratado

### Associado de estoque

Quando houver `ai.aplicaestoque = true`, a camada compartilhada:

1. identifica o produto realmente movimentado
2. converte a quantidade pela relacao de embalagem
3. aplica o percentual adicional de `percentualcustoestoque`

Formula implementada:

- `quantidade_movimentada = quantidade_origem * (qtdembalagem_pri / qtdembalagem_ass) * (1 + percentual / 100)`

Essa formula ficou em:

- `calculateAssociatedStockQuantity(...)`

### Associado de custo

Quando houver `ai.aplicacusto = true`, a camada compartilhada:

1. atualiza primeiro o custo do produto base
2. lista os produtos associados de custo
3. propaga o custo final do produto base para os associados

Formula implementada:

- `custo_associado = custo_base / (qtdembalagem_pri / qtdembalagem_ass) * (1 + percentual / 100)`

Essa formula ficou em:

- `calculateAssociatedCostValue(...)`

Importante:

- estoque associado e custo associado foram tratados separadamente
- a camada nao assume que uma associacao de estoque tambem e, automaticamente, associacao de custo

## Como `logtransacao` foi centralizado

Antes:

- `troca.service.ts`
- `consumo.service.ts`
- `producao.service.ts`

tinham `INSERT INTO logtransacao` repetido.

Agora:

- todos usam `TransactionLogService.register(...)`

Esse servico centraliza:

- `id_loja`
- `referencia`
- `id_formulario`
- `id_tipotransacao`
- `id_usuario`
- `ipterminal`
- `versao`
- `id_referencia`

Para os eventos mobile, o terminal padrao ficou:

- `/MOBILE-SYNC`

## Como as rotinas passaram a usar a camada compartilhada

## Troca

Arquivo adaptado:

- `apps/api/src/adm/troca/troca.service.ts`

Agora a troca:

- delega a movimentacao de estoque ao `StockMovementService`
- delega `logtransacao` ao `TransactionLogService`
- continua dona apenas de:
  - `logtroca`
  - atualizacao do campo `troca`
  - validacao do motivo e do produto da troca

## Consumo

Arquivo adaptado:

- `apps/api/src/adm/consumo/consumo.service.ts`

Agora o consumo:

- delega a movimentacao de estoque ao `StockMovementService`
- delega `logtransacao` ao `TransactionLogService`
- continua dono apenas de:
  - `insert/update` na tabela `consumo`
  - campos fiscais e de custo da linha de consumo
  - validacao do tipo de consumo e do produto

## Producao

Arquivo adaptado:

- `apps/api/src/adm/producao/producao.service.ts`

Agora a producao:

- usa o `StockMovementService` para baixar os insumos
- usa o `StockMovementService` para a entrada do produto produzido
- usa o `TransactionLogService` para `logtransacao`
- recebe da camada compartilhada o custo final atualizado do produto produzido
- continua dona apenas de:
  - validacao da receita
  - leitura dos itens da receita
  - `producao`
  - `producaoitem`

Melhoria importante:

- a producao deixou de manter a regra de estoque/custo espalhada dentro do service
- o custo gravado em `producao` agora pode seguir o custo final aplicado pela camada compartilhada

## Testabilidade e validacao

Teste adicionado:

- `apps/api/src/stock-movement/stock-movement-formulas.spec.ts`

O teste cobre:

- conversao de quantidade por associado de estoque
- aplicacao de percentual em associado de estoque
- propagacao de custo por associado
- calculo de custo medio ponderado

## Limitacoes e proximos refinamentos recomendados

### 1. `estoquecongelado`

Os flags:

- `baixareceita`
- `baixaassociado`
- `baixaperda`

foram mantidos no mesmo padrao do legado observado.

Ainda vale revisar depois se alguma rotina precisa sobrescrever esses valores de forma mais expressiva.

### 2. Custo medio em associacao de custo

A implementacao propaga tambem o custo medio final do produto base para os associados, usando a mesma formula de embalagem e percentual.

Isso atende a ideia funcional de custo associado, mas ainda merece validacao operacional com dados reais do VRMaster.

### 3. Outras rotinas

`balanco` e outras rotinas nao foram migradas para essa camada nesta etapa.

O foco ficou apenas em:

- `troca`
- `consumo`
- `producao`

## Resultado final

A base nova deixou de ter tres implementacoes separadas de movimentacao de estoque.

Agora existe uma camada compartilhada que concentra:

- estoque congelado
- associado de estoque
- associado de custo
- `logestoque`
- `logcusto`
- `logtransacao`
- atualizacao de `produtocomplemento`

E as rotinas ficaram mais limpas, mantendo apenas o que e realmente especifico do seu dominio.
