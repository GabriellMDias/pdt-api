# Mobile Stock Movement Architecture

## Objetivo

Centralizar na API nova toda a logica compartilhada de movimentacao de estoque usada por:

- `troca`
- `consumo`
- `producao`

Sem repetir em cada rotina:

- verificacao de estoque congelado
- resolucao de produto associado
- calculo da quantidade realmente movimentada
- gravacao em `estoquecongelado`
- gravacao em `logestoque`
- atualizacao de `produtocomplemento`
- gravacao de `logtransacao`

## Estado atual no projeto novo

Arquivos auditados na base nova:

- `apps/api/src/adm/troca/troca.service.ts`
- `apps/api/src/adm/consumo/consumo.service.ts`
- `apps/api/src/adm/producao/producao.service.ts`
- `apps/api/src/mobile-sync/processors/exchange-item-recorded.processor.ts`
- `apps/api/src/mobile-sync/processors/consumption-item-recorded.processor.ts`
- `apps/api/src/mobile-sync/processors/production-item-recorded.processor.ts`
- `apps/api/src/db/pg/pg.service.ts`
- `apps/mobile/src/features/troca/data/troca-db.ts`
- `apps/mobile/src/features/consumo/data/consumo-db.ts`
- `apps/mobile/src/features/producao/data/producao-db.ts`

## O que a base nova faz hoje

### Mobile

O mobile novo:

- captura os dados da rotina
- persiste localmente
- gera evento de outbox
- transmite o evento para a API

Eventos relevantes hoje:

- `exchange.item.recorded`
- `consumption.item.recorded`
- `production.item.recorded`

Conclusao:

- o mobile nao deve virar dono da regra de estoque
- ele deve continuar apenas capturando intencao operacional

### API

A API nova hoje processa cada rotina diretamente no respectivo service.

Duplicacoes observadas:

- `INSERT INTO logestoque` repetido
- `INSERT INTO logtransacao` repetido
- `UPDATE produtocomplemento` repetido
- calculo de `nextStock` repetido

Lacunas observadas:

- nao ha verificacao de `estoquecongelado`
- nao ha uso de `associado` ou `associadoitem`
- nao ha resolucao compartilhada de produto associado
- nao ha camada compartilhada de custo
- nao ha centralizacao de `logtransacao`

Ponto tecnico importante:

- `PgService` ja oferece `transaction(...)`
- as rotinas auditadas nao estao usando essa abstracao compartilhada como camada principal de orquestracao

Consequencia:

- a base nova hoje reimplementa parcialmente regras que o legado ja concentrava
- e ainda perde partes importantes, como congelamento e associado

## Direcao arquitetural proposta

## Principio central

Cada rotina deve continuar sendo dona apenas de:

- validacoes de dominio
- leitura de catalogos e entidades proprias
- persistencia especifica da rotina

Toda a logica de movimento de estoque deve migrar para uma camada compartilhada.

## Camadas propostas

### 1. `StockMovementService`

Servico de fachada usado por `troca`, `consumo` e `producao`.

Responsabilidade:

- receber uma intencao de movimento
- coordenar o planejamento e a execucao
- devolver o resultado aplicado

Ele nao deve ter regra especifica de tela ou de mobile. Ele deve ser um servico de dominio do backend.

### 2. `StockFreezeResolverService`

Responsabilidade:

- verificar se a loja esta com estoque congelado
- decidir se o destino da persistencia sera:
  - estoque normal
  - `estoquecongelado`

Fontes de dados esperadas:

- `parametrovalor`
- `parametro`

### 3. `ProductAssociationResolverService`

Responsabilidade:

- resolver associacao de estoque
- descobrir qual produto realmente deve ser movimentado
- calcular a quantidade real a partir de:
  - `associado.qtdembalagem`
  - `associadoitem.qtdembalagem`
  - `associadoitem.percentualcustoestoque`

Saida esperada:

- `resolvedProductId`
- `resolvedQuantity`
- `associationSource`
- dados usados no calculo

Importante:

- esta camada deve tratar estoque associado
- ela nao deve assumir, sozinha, que custo associado segue a mesma regra

### 4. `CostAssociationResolverService`

Responsabilidade:

- resolver propagacao de custo quando houver regras de associado para custo
- calcular custo derivado sem misturar isso com a resolucao do estoque

Motivo da separacao:

- o legado mostrou claramente a centralizacao de associado para estoque
- nao mostrou uma centralizacao equivalente para `aplicacusto`
- no seu contexto funcional, custo associado e uma regra propria e precisa ficar explicita

### 5. `StockMovementPlannerService`

Responsabilidade:

- transformar a intencao da rotina em um plano executavel

Exemplo de saida de um plano:

- movimentos de estoque diretos
- movimentos para `estoquecongelado`
- atualizacoes de custo
- registros de `logtransacao`
- resultados esperados por produto afetado

Esse planner e especialmente importante para producao, porque ela nao e um movimento unico. Ela gera um conjunto de movimentos:

- saidas de insumos
- entrada do produto produzido
- eventual atualizacao de custo do item produzido

### 6. `StockMovementExecutorService`

Responsabilidade:

- executar o plano dentro de uma transacao real
- escrever:
  - `estoquecongelado`
  - `logestoque`
  - `logcusto`
  - `produtocomplemento`

Regra obrigatoria:

- esse executor deve rodar dentro de `this.pg.transaction(...)`

### 7. `TransactionLogService`

Responsabilidade:

- centralizar o `INSERT INTO logtransacao`
- padronizar:
  - `id_formulario`
  - `id_tipotransacao`
  - `ipterminal`
  - `versao`
  - `referencia`

Essa camada deve ser chamada pela orquestracao compartilhada, nao por SQL inline em cada rotina.

## Modelo de entrada proposto

Cada rotina continuaria chamando a camada compartilhada com um objeto de intencao.

Exemplo conceitual:

```ts
type StockMovementIntent = {
  storeId: number;
  userId: number;
  source: 'exchange' | 'consumption' | 'production';
  movementTypeId: number;
  formId: number;
  transactionTypeId: number;
  ipTerminal: string;
  entries: Array<{
    productId: number;
    signedQuantity: number;
    updateCost: boolean;
    costs?: {
      costWithoutTax: number;
      costWithTax: number;
    };
    metadata?: Record<string, unknown>;
  }>;
};
```

Interpretacao:

- `troca` e `consumo` normalmente enviariam uma unica entrada
- `producao` enviaria varias:
  - uma por insumo com saida
  - uma do produto produzido com entrada e `updateCost = true`

## Fluxo de decisao proposto

Fluxo esperado dentro da camada compartilhada:

1. receber a intencao da rotina
2. para cada entrada:
   - validar quantidade
   - resolver associado de estoque
   - resolver custo associado, se aplicavel
   - carregar estado atual do produto realmente afetado
3. consultar se a loja esta com estoque congelado
4. montar um plano final de execucao
5. abrir transacao real
6. executar cada passo do plano
7. registrar `logtransacao`
8. executar a persistencia especifica da rotina
9. confirmar a transacao

## O que cada rotina continuara informando

## Troca

Continuara especifica em:

- motivo da troca
- semantica de `Adicionar/Remover`
- atualizacao da coluna `troca`
- persistencia em `logtroca`

Entrada esperada para a camada compartilhada:

- movimento tipo 18
- formulario 196
- tipo transacao 1
- produto
- quantidade assinada
- usuario
- loja

## Consumo

Continuara especifico em:

- tipo de consumo
- agregacao por dia, loja, produto e tipo
- persistencia em `consumo`
- campos fiscais da linha de consumo

Entrada esperada para a camada compartilhada:

- movimento tipo 11
- formulario 9
- tipo transacao 1
- produto
- quantidade assinada
- usuario
- loja

## Producao

Continuara especifica em:

- validacao da receita
- expansao da receita em insumos
- calculo do custo unitario do produto produzido
- persistencia em `producao` e `producaoitem`

Entrada esperada para a camada compartilhada:

- varios movimentos tipo 23
- formulario 85
- tipo transacao 0
- saidas dos insumos
- entrada do produto acabado
- custos calculados do item produzido

## O que deve ser centralizado

Centralizar obrigatoriamente:

- leitura do estado atual do produto afetado
- resolucao de produto associado para estoque
- resolucao de custo associado
- calculo da quantidade realmente movimentada
- verificacao de estoque congelado
- escrita em `estoquecongelado`
- escrita em `logestoque`
- escrita em `logcusto`
- atualizacao de `produtocomplemento`
- escrita em `logtransacao`
- abertura e fechamento transacional

## O que deve continuar separado

Deve continuar fora da camada compartilhada:

- validacoes de UI/mobile
- shape do evento de sync do mobile
- regras de selecao de motivo ou receita
- agregacao especifica de `consumo`
- `logtroca`
- `producao` e `producaoitem`
- qualquer regra de reconciliacao visual da rotina

## Como a camada compartilhada deve decidir o destino do movimento

### Caso 1. Produto sem associado e estoque liberado

Resultado esperado:

- inserir `logestoque`
- atualizar `produtocomplemento.estoque`

### Caso 2. Produto com associado de estoque e estoque liberado

Resultado esperado:

- resolver produto real pelo associado
- converter a quantidade
- inserir `logestoque` no produto real
- atualizar `produtocomplemento.estoque` do produto real

### Caso 3. Estoque congelado

Resultado esperado:

- nao atualizar estoque diretamente
- inserir em `estoquecongelado`
- manter rastreabilidade do movimento

### Caso 4. Movimento com atualizacao de custo

Resultado esperado:

- calcular custo unitario e custo medio
- inserir `logcusto`
- atualizar custos em `produtocomplemento`
- sem duplicar essa regra na rotina chamadora

## Estrutura sugerida de pastas

Sugestao em `apps/api/src/stock-movement`:

- `stock-movement.module.ts`
- `stock-movement.service.ts`
- `stock-movement-planner.service.ts`
- `stock-movement-executor.service.ts`
- `stock-freeze-resolver.service.ts`
- `product-association-resolver.service.ts`
- `cost-association-resolver.service.ts`
- `transaction-log.service.ts`
- `types.ts`

Sugestao de adaptadores por rotina:

- `apps/api/src/adm/troca/troca.service.ts`
- `apps/api/src/adm/consumo/consumo.service.ts`
- `apps/api/src/adm/producao/producao.service.ts`

Esses services continuariam existindo, mas como adaptadores finos de dominio.

## Estrategia de migracao recomendada

## Fase 1. Centralizar o minimo que ja esta claramente duplicado

Primeiro extrair:

- `TransactionLogService`
- `StockFreezeResolverService`
- `ProductAssociationResolverService`
- `StockMovementExecutorService`

Meta:

- parar de repetir `logestoque`, `logtransacao` e `UPDATE produtocomplemento`
- trazer de volta o comportamento de estoque congelado
- trazer de volta associado de estoque

## Fase 2. Introduzir o planner

Depois introduzir:

- `StockMovementPlannerService`

Meta:

- permitir que producao pare de montar manualmente varios movimentos
- garantir plano unico e transacao unica

## Fase 3. Introduzir custo associado

Por fim:

- `CostAssociationResolverService`

Meta:

- tratar o caso funcional que o legado nao centralizava bem
- evitar misturar regra de custo com regra de estoque

## Principais riscos

### Misturar estoque associado e custo associado como se fossem a mesma regra

Risco:

- produzir calculos incorretos
- atualizar custo do produto errado

Mitigacao:

- manter resolvers separados

### Manter SQL inline nas rotinas

Risco:

- perpetuar duplicacao
- divergencia de comportamento entre troca, consumo e producao

Mitigacao:

- transformar os services de rotina em adaptadores finos

### Nao usar transacao real

Risco:

- escrita parcial
- `logestoque` sem `produtocomplemento`
- `producao` com insumos baixados e produto acabado sem entrada

Mitigacao:

- obrigar execucao via `PgService.transaction(...)`

### Reproduzir cegamente os flags de `estoquecongelado` do legado

Risco:

- carregar um comportamento antigo que talvez funcione por coincidencia

Mitigacao:

- documentar explicitamente os significados desses flags
- revalidar se `baixareceita`, `baixaassociado` e `baixaperda` devem continuar fixos

## Leitura final

O caminho mais seguro para a base nova nao e copiar o SQL de `troca`, `consumo` e `producao` tres vezes.

O caminho correto, baseado no legado e no estado atual da API, e:

- manter o mobile como coletor e transmissor
- transformar a API no lugar unico da regra de estoque
- centralizar a decisao de congelamento
- centralizar a resolucao de associado
- centralizar `logtransacao`
- centralizar a execucao transacional
- deixar as rotinas especificarem apenas o que e proprio do seu dominio

Assim a base nova preserva o que o legado tinha de melhor, mas elimina a duplicacao e endurece a consistencia transacional.
