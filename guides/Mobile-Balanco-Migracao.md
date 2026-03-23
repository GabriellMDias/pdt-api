# Mobile Balanco Migracao

## Fontes revisadas

Arquivos principais do legado analisados:

- `apps/mobile_old/mobile_front/app/estoque/balanco/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/app/estoque/balanco/[idBalanco].tsx`
- `apps/mobile_old/mobile_front/app/estoque/balanco/lancamento/[idBalanco].tsx`
- `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- `apps/mobile_old/mobile_front/components/ProductInput.tsx`
- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile_old/mobile_front/database/migrations/1.ts`
- `apps/mobile_old/mobile_front/database/migrations/5.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/balanco.ts`
- `apps/mobile_old/mobile_backend/src/syncronize/index.ts`

Arquivos do app novo usados para comparacao e reaproveitamento:

- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-screen.tsx`
- `apps/mobile/src/features/consumo/components/consumo-screen.tsx`
- `apps/mobile/src/features/producao/components/producao-screen.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/transmission-header.tsx`
- `apps/mobile/src/features/shared/products/components/product-lookup-field.tsx`
- `apps/mobile/src/features/shared/products/data/product-catalog-db.ts`
- `apps/mobile/src/features/mobile-sync/services/mobile-sync-service.ts`

## Estrutura da rotina antiga

### Tela principal agrupada por numero de balanco

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/balanco/transmissionScreen.tsx`

Responsabilidades:

- listar os balancos ja coletados localmente de forma agrupada por `id_balanco`
- exibir quantos itens estao pendentes, transmitidos e totais por balanco
- permitir exclusao em lote de todos os itens de um balanco pelo swipe
- abrir modal para escolher um balanco aberto antes de iniciar nova coleta
- transmitir pendencias de todos os balancos da loja atual

Consulta principal observada:

- `queryLogBalancoTotal` faz `JOIN` entre `logbalancoitem` e `balanco`
- agrega por `b.id`
- calcula:
  - `qtd_transmitida`
  - `qtd_nao_transmitida`
  - `qtd_total`
  - `transmitido` sintetico `0 | 1 | 2`

### Tela de itens de um balanco especifico

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/balanco/[idBalanco].tsx`

Responsabilidades:

- listar todos os itens ja coletados para um `id_balanco`
- mostrar status de transmissao por linha
- permitir exclusao individual por swipe
- transmitir pendencias do balanco atual
- abrir novamente a tela de coleta para continuar lancando itens no mesmo balanco

### Tela de coleta

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/balanco/lancamento/[idBalanco].tsx`

Responsabilidades:

- receber o `idBalanco` pela rota
- selecionar produto por busca local ou scanner
- informar `Quantidade`
- informar `Embalagem`
- calcular `Total`
- alternar entre `Adicionar` e `Remover`
- mostrar dados auxiliares do produto
- gravar um item local em `logbalancoitem`

## Fluxo funcional completo

1. Abrir a tela principal de balanco.
2. Ver balancos ja coletados agrupados por numero.
3. Se tocar em um balanco existente, abrir a tela de itens daquele balanco.
4. Se tocar no `+` na tela principal, abrir um modal com `DropDownPicker` para escolher um balanco aberto.
5. Confirmar o balanco e navegar para a tela de coleta.
6. Na coleta:
   - buscar produto por descricao, codigo interno ou codigo de barras
   - opcionalmente ler pela camera
   - informar quantidade e embalagem
   - escolher `Adicionar` ou `Remover`
   - salvar
7. Apos salvar:
   - limpar campos
   - recalcular saldo coletado local do produto
   - voltar o foco para o campo de produto
8. Voltar para a tela de itens ou para a tela agrupada e transmitir quando necessario.

## Campos e modelagem legada

### Catalogo sincronizado

Tabela `balanco`:

- `id`
- `id_loja`
- `descricao`
- `estoque`
- `id_situacaobalanco`

Tabela `produto` compartilhada:

- usada para lookup, scanner e dados auxiliares
- inclui `decimal`, `codigobarras`, `descricaocompleta`, `estoque`, `precovenda`, `customediocomimposto`, `id_tipoembalagem`, `qtdembalagem`

### Lancamentos locais

Tabela `logbalancoitem`:

- `id`
- `codigobarras`
- `id_balanco`
- `id_produto`
- `id_tipoentradasaida`
- `quantidade`
- `transmitido`

Observacao importante:

- o legado nao criava cabecalho local separado de coleta
- o agrupamento por balanco era derivado por consulta em cima de `logbalancoitem`

## Regras de negocio percebidas

### Regra do balanco

- o modal de escolha so oferece balancos com `id_situacaobalanco = 0`
- no backend, `lancamentoBalanco` valida novamente o estado:
  - `0`: aberto, aceita
  - `1`: finalizado, rejeita
  - outro valor: excluido, rejeita

### Regra de produto

- a coleta usa o componente compartilhado `ProductInput.tsx`
- o backend rejeita produto excluido com erro como `Codigo X excluido`

### Regra de quantidade

- so salva se houver produto selecionado e se `quantidade > 0` e `embalagem > 0`
- `Adicionar` grava `id_tipoentradasaida = 0`
- `Remover` grava `id_tipoentradasaida = 1`
- o total salvo e `quantidade * embalagem`

### Regra de remocao

- ao remover, a tela consulta o saldo local coletado por produto no mesmo balanco
- a validacao considera o saldo local pendente
- se a remocao for maior que o saldo coletado pendente, bloqueia com:
  - `Quantidade removida maior que o total coletado!`

## Scanner no legado

O scanner existia via `ProductInput.tsx`.

Comportamento identificado:

- busca por:
  - codigo de barras exato
  - codigo interno exato
  - codigo pesado por substring do barcode
- toca beep de sucesso quando encontra produto
- toca som de erro quando nao encontra
- permite foco automatico para o proximo campo com `nextRef`

Importante:

- o fluxo de balanco antigo nao tinha modo continuo como a ruptura nova
- era coleta produto a produto, com scanner como acelerador de selecao

## Fluxo de transmissao legado

Na tela agrupada e na tela de itens:

- filtra itens com `transmitido = 0`
- monta payload por item
- agrega por:
  - loja
  - balanco
  - produto
  - usuario
  - ip terminal
- soma quantidades equivalentes
- ordena de forma estavel
- quebra em lotes de `500`
- envia com chave de idempotencia
- aceita `200`, `202` e `409`
- marca como transmitidos apenas os itens aceitos

Ponto importante:

- no legado ja existia um cuidado melhor com volume e idempotencia no balanco do que em outras rotinas antigas
- isso e uma caracteristica boa para preservar conceitualmente no app novo

## Diferencas funcionais em relacao a ruptura, troca, consumo e producao

### Em relacao a ruptura

- balanco nao e por prateleira
- nao ha coleta continua
- o agrupamento e por `numero de balanco`
- existe uma segunda tela de itens do grupo selecionado

### Em relacao a troca e consumo

- troca e consumo sao listas simples de lancamentos da feature
- balanco tem dois niveis:
  - grupos por numero de balanco
  - itens do balanco selecionado
- a validacao de remocao e por produto dentro do mesmo balanco, nao por motivo

### Em relacao a producao

- producao e receita + quantidade, sem scanner como eixo principal
- balanco volta a ser uma rotina centrada em produto, como troca e consumo
- mas com o agrupamento extra por `id_balanco`

## Pontos de atencao para migrar ao app novo

- o balanco precisa nascer com tres fluxos claros:
  - lista agrupada de balancos
  - lista de itens de um balanco
  - coleta de itens
- a tela de itens precisa ser pensada para volume alto desde o inicio
- o app novo nao deve repetir o padrao do legado de carregar tudo e renderizar tudo sem filtro
- a transmissao do novo app deve usar outbox por evento, nao conciliacao fragil por produto
- a loja atual deve vir da infraestrutura global do app novo
- o catalogo de produtos deve continuar compartilhado, como ja acontece em troca, consumo e ruptura
- a validacao de quantidade decimal e de remocao pode aproveitar a base compartilhada ja criada

## Implementacao atual no app novo

Arquitetura aplicada em `apps/mobile`:

- tela principal `balanco-screen.tsx`
  - lista apenas os balancos com coleta local, agrupados por `balance_id`
  - abre modal seletor para escolher um balanco em aberto antes de iniciar nova coleta
- tela de itens `balanco-items-screen.tsx`
  - abre ao tocar num balanco agrupado
  - lista os itens daquele balanco com filtro local e carregamento incremental
- tela de coleta `balanco-collect-screen.tsx`
  - recebe `storeId + balanceId`
  - reaproveita busca de produto, scanner, sons e validacoes compartilhadas

Modelagem local implementada:

- `balance_headers`
  - catalogo sincronizado dos balancos por loja
- `balance_entries`
  - um evento local por coleta
- `sync_outbox_events`
  - um evento `balance.item.recorded` por coleta, com idempotencia

Regra mantida do legado:

- o agrupamento continua por numero de balanco
- a remocao continua limitada ao saldo coletado local do mesmo balanco
- a coleta continua centrada em produto, nao em prateleira, receita ou motivo
