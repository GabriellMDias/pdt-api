# Mobile Legado Contratos

## Objetivo

Este documento resume os contratos tecnicos do backend legado em `apps/mobile_old/mobile_backend`, incluindo endpoints, modulos equivalentes a repositories, servicos/orquestradores e tipos TS usados como DTOs. O foco e acelerar a migracao para a nova arquitetura sem inventar comportamento.

## Panorama tecnico do backend legado

- Stack observada: Express + `pg` + TypeScript, sem NestJS e sem camada formal de DTO validation.
- Persistencia: um `pg.Client` global em `src/database/db.ts`, inicializado no boot com variaveis `PG_DATABASE_HOST`, `PG_DATABASE_PORT`, `PG_DATABASE_NAME`, `PG_DATABASE_USER`, `PG_DATABASE_PASSWORD`.
- Estrutura real: os arquivos em `src/database/queries/**` funcionam como repositories e, em varios casos, tambem como services.
- Autenticacao: o backend legado analisado nao expoe endpoint de login nem middleware de autorizacao. As rotas sao operacionais e de sync.
- Idempotencia: existe apenas para `POST /transmit/lancamentobalanco`, via tabela auxiliar `pdtconnect.api_idempotency`.

## Endpoints legados

| Metodo e rota | Origem | Request esperado | Response observado | Observacoes de contrato |
| --- | --- | --- | --- | --- |
| `GET /testconnection/:devicename` | `src/index.ts` | Param de rota `devicename` | Texto simples `pdtm-server` | Endpoint de health check usado pelo frontend antigo antes do sync. |
| `GET /sync/stores` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao }>` | Sem autenticacao, sem paginacao, sem delta. |
| `GET /sync/tipoembalagem` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao, descricaocompleta }>` | Usado para preencher banco local e compor busca de produto. |
| `POST /sync/products` | `src/syncronize/index.ts` | `{ idLoja: number }` | `Array<Produto>` | O route handler envia `result.rows` da query. |
| `POST /sync/recipes` | `src/syncronize/index.ts` | `{ idLoja: number }` | `Array<{ id, descricao, id_produto }>` | Usado pela feature de producao. |
| `GET /sync/tipomotivotroca` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao }>` | Catalogo para troca. |
| `GET /sync/tipoconsumo` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao }>` | Catalogo para consumo. |
| `GET /sync/tipomotivoquebra` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao }>` | Catalogo existente no backend legado, mesmo sem rota de transmissao equivalente no recorte atual. |
| `GET /sync/tipomotivoperda` | `src/syncronize/index.ts` | Sem body | `Array<{ id, descricao }>` | Mesmo caso de quebra. |
| `POST /sync/balancos` | `src/syncronize/index.ts` | `{ idLoja: number }` | `Array<{ id, id_loja, descricao, estoque, id_situacaobalanco }>` | O `getBalancos` ja devolve `rows`; o handler envia o array diretamente. |
| `POST /transmit/lancamentotroca` | `src/transmit/index.ts` | `TrocaProps[]` | `TrocaProps[]` com apenas os itens processados com sucesso | O processamento e serial, item a item. O frontend antigo comparava o retorno para marcar transmitidos. |
| `POST /transmit/lancamentoconsumo` | `src/transmit/index.ts` | `ConsumoProps[]` | `ConsumoProps[]` com apenas os itens processados com sucesso | Mesmo padrao de retorno parcial da troca. |
| `POST /transmit/lancamentoproducao` | `src/transmit/index.ts` | `ProducaoProps[]` | `ProducaoProps[]` com apenas os itens processados com sucesso | Tambem processa item a item. |
| `POST /transmit/lancamentobalanco` | `src/transmit/index.ts` | `BalancoItemProps[]` e header `X-Idempotency-Key` | `BalancoItemProps[]` com itens processados com sucesso, ou replay da resposta anterior | Unica rota com idempotencia server-side. Em conflito de payload, responde `409`. Em processamento concorrente, responde `202`. |
| `POST /transmit/lancamentoruptura` | `src/transmit/index.ts` | `RupturaItemsProps[]` | Eco do body recebido | O retorno nao expressa sucesso parcial. Se a query falhar, ainda assim a rota responde `200` com o body original. |
| `GET /checkforupdate/getlatestversion/:ip/:port` | `src/checkForUpdate/index.ts` | Params `ip` e `port` | JSON de `apk/latestVersion.json` com `apkUrl` calculado | Contrato de distribuicao antigo, acoplado a arquivo local e URL montada no servidor. |
| `GET /checkforupdate/downloadlatest/*` | `src/checkForUpdate/index.ts` | Arquivo estatico | Download do APK | Fluxo legado de distribuicao fora de store oficial. |

## Modulos equivalentes a repositories

| Modulo | Papel tecnico | Consumido por |
| --- | --- | --- |
| `src/database/queries/stores.ts` | Leitura de lojas | `GET /sync/stores` |
| `src/database/queries/tipos.ts` | Leitura de catalogos de apoio | Rotas `/sync/tipo*` |
| `src/database/queries/products.ts` | Leitura de produtos e parametros fiscais/custo | `sync/products`, engine de estoque, balanco, consumo, troca, producao |
| `src/database/queries/utils.ts` | Leitura de metadados do ERP | `logTransacao.ts` |
| `src/database/queries/logTransacao.ts` | Gravacao de auditoria transversal | Balanco, consumo, troca, producao |
| `src/database/queries/administrativo/ruptura.ts` | Gravacao de ruptura | `POST /transmit/lancamentoruptura` |
| `src/database/queries/estoque/balanco.ts` | Sync e gravacao de balanco | `sync/balancos`, `transmit/lancamentobalanco` |
| `src/database/queries/estoque/estoque.ts` | Engine compartilhada de estoque e custo | Consumo, troca, producao |
| `src/database/queries/estoque/consumo.ts` | Regra e persistencia de consumo | `POST /transmit/lancamentoconsumo` |
| `src/database/queries/estoque/troca.ts` | Regra e persistencia de troca | `POST /transmit/lancamentotroca` |
| `src/database/queries/estoque/producao.ts` | Sync de receitas, regra e persistencia de producao | `sync/recipes`, `transmit/lancamentoproducao` |

## Servicos e orquestradores relevantes

| Funcao/modulo | Papel | Observacoes |
| --- | --- | --- |
| `generateStockMovement` em `src/database/queries/estoque/estoque.ts` | Orquestra estoque congelado, produto associado, log de estoque e eventual alteracao de custo | E o servico mais importante do legado para troca, consumo e producao. |
| `insertLogTransacao` em `src/database/queries/logTransacao.ts` | Orquestra escrita em `logtransacao` com versao do ERP | Usa `getVRVersion()` internamente. |
| `withIdempotency` em `src/lib/idempotency.ts` | Middleware de idempotencia por endpoint e payload | Hoje aplicado apenas ao balanco. |
| `logger.transmissionLog` em `src/lib/logger.ts` | Registro em arquivo das transmissoes bem sucedidas | Nao afeta regra de negocio, mas ajuda diagnostico. |
| Handlers em `src/syncronize/index.ts` | Adaptadores HTTP para leituras | Nao ha service layer separada. |
| Handlers em `src/transmit/index.ts` | Adaptadores HTTP para transmissao em lote | Processam arrays de itens e acumulam apenas os sucessos. |

## DTOs e tipos TypeScript encontrados

Observacao importante: o legado nao usa classes DTO nem validacao declarativa. Os contratos sao apenas `type`s locais e tipagem nos handlers.

| Tipo | Arquivo | Papel | Campos principais | Exposicao |
| --- | --- | --- | --- | --- |
| `Produto` | `src/database/queries/products.ts` | Shape de resposta de `sync/products` | `id`, `codigobarras`, `qtdembalagem`, `decimal`, `id_tipoembalagem`, `descricaocompleta`, `pesobruto`, `permitequebra`, `permiteperda`, `precovenda`, `estoque`, `troca`, `customediocomimposto`, `fabricacaopropria` | Exposto indiretamente via rota |
| `AssociatedStockProduct` | `src/database/queries/products.ts` | Resultado interno da regra de produto associado | `qtdembalagem_pri`, `id_produto_ass`, `qtdembalagem_ass`, `percentualcustoestoque_ass` | Interno |
| `ProductParams` | `src/database/queries/products.ts` | Parametros fiscais e de custo por produto/loja | `id_situacaocadastro`, `custosemimposto`, `custocomimposto`, `customediosemimposto`, `customediocomimposto`, `estoque`, `id_aliquotacreditocusto`, `piscofins`, `id_tipopiscofins`, `valoripi`, `valoricmssubstituicao`, `valorbasepiscofins`, `valorpis`, `valorcofins` | Interno |
| `LogTransacaoQueryParams` | `src/database/queries/logTransacao.ts` | Payload interno para `logtransacao` | `idStore`, `idProduct`, `idForm`, `idTransactionType`, `idUser`, `ipTerminal` | Interno |
| `RupturaItemsProps` | `src/database/queries/administrativo/ruptura.ts` | Body de `POST /transmit/lancamentoruptura` | `idLoja`, `prateleita`, `ipTerminal`, `idUser`, `idProdutos` | Exposto |
| `BalancoItemProps` | `src/database/queries/estoque/balanco.ts` | Body de `POST /transmit/lancamentobalanco` | `idLoja`, `idBalanco`, `idProduto`, `quantidade`, `ipTerminal`, `idUser` | Exposto |
| `Balanco` | `src/database/queries/estoque/balanco.ts` | Shape de resposta de `sync/balancos` | `id`, `id_loja`, `descricao`, `estoque`, `id_situacaobalanco` | Exposto indiretamente |
| `InsertStockFrozenParams` | `src/database/queries/estoque/estoque.ts` | Payload interno da fila de estoque congelado | `idStore`, `idProduct`, `idMovementType`, `quantity`, `idInOrOut` | Interno |
| `UpdateStock` | `src/database/queries/estoque/estoque.ts` | Payload interno do log e update de estoque | `idStore`, `idProduct`, `quantity`, `idMovementType`, `idUser`, `stock`, `idInOrOut`, custos e custos medios | Interno |
| `Costs` | `src/database/queries/estoque/estoque.ts` | Custos usados em producao | `custosemimposto`, `custocomimposto` | Interno |
| `UpdateCost` | `src/database/queries/estoque/estoque.ts` | Payload interno de alteracao de custo | `idStore`, `idProduct`, `idUser`, custos atuais, anteriores e `observacao` | Interno |
| `GenerateStockMovementParams` | `src/database/queries/estoque/estoque.ts` | Contrato central da engine de estoque | `idStore`, `idProduct`, `idUser`, `idMovementType`, `quantity`, `idInOrOut`, `updateCost`, `costs?` | Interno |
| `ConsumoProps` | `src/database/queries/estoque/consumo.ts` | Body de `POST /transmit/lancamentoconsumo` | `idLoja`, `idProduto`, `quantidade`, `idTipoConsumo`, `ipTerminal`, `idUser` | Exposto |
| `TrocaProps` | `src/database/queries/estoque/troca.ts` | Body de `POST /transmit/lancamentotroca` | `idLoja`, `idProduto`, `quantidade`, `idTipoTroca`, `ipTerminal`, `idUser` | Exposto |
| `Recipe` | `src/database/queries/estoque/producao.ts` | Shape de resposta de `sync/recipes` | `id`, `descricao`, `id_produto` | Exposto indiretamente |
| `RecipeItem` | `src/database/queries/estoque/producao.ts` | Resultado interno de calculo de receita | `id_produto`, `custocomimposto_utilizado`, `custosemimposto_utilizado`, `fatorconversao`, `qtd_utilizada` | Interno |
| `ProducaoProps` | `src/database/queries/estoque/producao.ts` | Body de `POST /transmit/lancamentoproducao` | `idLoja`, `idProduto`, `quantidade`, `ipTerminal`, `idUser` | Exposto |

## Contratos herdados que impactam a migracao

- Os endpoints de `transmit` recebem arrays e respondem arrays. O frontend antigo usava esse eco parcial para descobrir quais itens locais foram aceitos.
- O contrato nao possui identificador de operacao do cliente alem da idempotencia de balanco. Para troca, consumo, producao e ruptura, a reconciliacao depende do corpo transmitido.
- A maioria das rotas retorna `200` mesmo quando parte do lote falha; o usuario so percebe pela diferenca entre request e response.
- `POST /transmit/lancamentoruptura` e o caso mais fragil: ele devolve o body original mesmo se a gravacao falhar.
- A distribuicao antiga do app depende de arquivo local `apk/latestVersion.json` e rota estatica de APK, nao de store nem de EAS Update.

## Riscos tecnicos observados

- Nao existe validacao formal de request body.
- Nao existe autenticacao nem autorizacao no backend legado analisado.
- As queries de `ruptura`, `balanco`, `consumo`, `troca` e `producao` interpolam valores diretamente em SQL em varios pontos.
- As funcoes `lancamentoConsumoWithQuery` e `lancamentoTrocaWithQuery` continuam no codigo, mas nao sao usadas pelas rotas atuais. Elas representam regra antiga monolitica e nao deveriam ser tomadas como baseline de migracao.
- `lancamentoProducao` faz `recipeItems.map(async ...)` sem `await`, o que cria risco de movimentos de insumo fora do controle transacional esperado.
- A idempotencia cobre apenas balanco; as outras transmissoes continuam suscetiveis a reenvio duplicado em queda de internet.
- O contrato `RupturaItemsProps.prateleita` sugere typo em relacao a coluna `prateleira`.

## Pendencias de dominio

- Confirmar o significado oficial dos codigos de formulario, movimento e tipo de transacao usados no ERP.
- Confirmar se `idUser` deve ser obrigatorio em todas as rotas novas ou se existe algum usuario tecnico equivalente ao `COLETORM` citado nos comentarios antigos.
- Confirmar se o modelo agregado de `consumo` por dia e `balanco` por soma ainda e desejado no desenho novo.
- Confirmar a regra completa de produto associado e estoque congelado antes de portar a engine de estoque.
