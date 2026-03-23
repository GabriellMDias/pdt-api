# VRMaster Query Catalog

## Objetivo e escopo

Este catalogo extrai as queries encontradas em `apps/mobile_old/mobile_backend/src` com foco no que o mobile legado lia ou gravava no ecossistema VRMaster. O objetivo e facilitar a reformulacao do app mobile e da nova API sem depender de leitura manual do legado toda vez.

Leitura recomendada:

- `reaproveitar`: a SQL pode servir quase literal como base de implementacao no backend novo
- `adaptar`: a regra vale, mas a implementacao deve ser reescrita ou encapsulada
- `substituir por endpoint novo`: nao migrar a query como esta; criar contrato novo e reimplementar a regra

Observacoes gerais:

- O backend legado nao tem camada formal de repository/service. Os arquivos em `src/database/queries/**` acumulam leitura, escrita e regra de negocio.
- As transacoes `BEGIN`, `COMMIT` e `ROLLBACK` nao entram como itens do catalogo por nao acessarem tabelas de negocio.
- O catalogo inclui ao final as queries de `pdtconnect.api_idempotency`, que nao pertencem ao VRMaster, mas impactam diretamente a migracao mobile.

## Q01 - Versao do ERP para auditoria

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/utils.ts`
- Feature relacionada: auditoria transversal de transmissao
- Objetivo da query: buscar a versao do ERP usada em `logtransacao`
- Tabelas usadas: `versao`
- Colunas usadas: `versao`, `id_programa`
- Joins/filtros importantes: `WHERE id_programa = 0`
- Risco de reaproveitamento: medio. A query e simples, mas o significado de `id_programa = 0` precisa continuar valido.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar se `id_programa = 0` continua sendo a versao que deve ser registrada em operacoes mobile.

## Q02 - Catalogo de tipo de embalagem

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/tipos.ts`
- Feature relacionada: sync inicial de catalogos
- Objetivo da query: listar tipos de embalagem para exibir descricao e apoiar regra de item decimal
- Tabelas usadas: `tipoembalagem`
- Colunas usadas: `id`, `descricao`, `descricaocompleta`
- Joins/filtros importantes: sem join, sem filtro
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q03 - Catalogo de motivo de troca

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/tipos.ts`
- Feature relacionada: troca
- Objetivo da query: listar motivos ativos de troca
- Tabelas usadas: `tipomotivotroca`
- Colunas usadas: `id`, `descricao`, `id_situacaocadastro`
- Joins/filtros importantes: `WHERE id_situacaocadastro = 1`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q04 - Catalogo de tipo de consumo

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/tipos.ts`
- Feature relacionada: consumo
- Objetivo da query: listar tipos ativos de consumo
- Tabelas usadas: `tipoconsumo`
- Colunas usadas: `id`, `descricao`, `id_situacaocadastro`
- Joins/filtros importantes: `WHERE id_situacaocadastro = 1`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q05 - Catalogo de motivo de quebra

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/tipos.ts`
- Feature relacionada: quebra
- Objetivo da query: listar motivos ativos de quebra
- Tabelas usadas: `tipomotivoquebra`
- Colunas usadas: `id`, `descricao`, `id_situacaocadastro`
- Joins/filtros importantes: `WHERE id_situacaocadastro = 1`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q06 - Catalogo de motivo de perda

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/tipos.ts`
- Feature relacionada: perda
- Objetivo da query: listar motivos ativos de perda
- Tabelas usadas: `tipomotivoperda`
- Colunas usadas: `id`, `descricao`, `id_situacaocadastro`
- Joins/filtros importantes: `WHERE id_situacaocadastro = 1`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q07 - Listagem de lojas

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/stores.ts`
- Feature relacionada: selecao de loja no sync inicial
- Objetivo da query: listar lojas disponiveis para operacao do coletor
- Tabelas usadas: `loja`
- Colunas usadas: `id`, `descricao`
- Joins/filtros importantes: sem join, sem filtro
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar

## Q08 - Catalogo de produtos por loja

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/products.ts`
- Feature relacionada: catalogo offline, busca de produtos e validacoes operacionais
- Objetivo da query: sincronizar o conjunto de produtos ativos da loja com estoque, troca e custo medio
- Tabelas usadas: `produto`, `produtocomplemento`, `produtoautomacao`
- Colunas usadas: `produto.id`, `produto.descricaocompleta`, `produto.pesobruto`, `produto.permitequebra`, `produto.permiteperda`, `produto.id_tipoembalagem`; `produtocomplemento.id_loja`, `produtocomplemento.id_situacaocadastro`, `produtocomplemento.precovenda`, `produtocomplemento.estoque`, `produtocomplemento.troca`, `produtocomplemento.customediocomimposto`, `produtocomplemento.fabricacaopropria`; `produtoautomacao.codigobarras`, `produtoautomacao.qtdembalagem`, `produtoautomacao.id_tipoembalagem`
- Joins/filtros importantes: `JOIN produtocomplemento pc ON pc.id_produto = p.id`; `JOIN produtoautomacao pa ON pa.id_produto = p.id`; `WHERE pc.id_situacaocadastro = 1 AND pc.id_loja = $1`; regra derivada `CASE WHEN p.id_tipoembalagem IN (4, 6, 9) THEN true ELSE false END AS decimal`
- Risco de reaproveitamento: medio. A leitura e valiosa, mas a regra de item decimal e o relacionamento com `produtoautomacao` precisam confirmacao de dominio.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar se os tipos de embalagem `4, 6, 9` continuam significando produto decimal no contexto do novo app.

## Q09 - Produto associado para baixa de estoque

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/products.ts`
- Feature relacionada: troca, consumo e producao
- Objetivo da query: descobrir se a movimentacao de um produto deve afetar o estoque de um item associado
- Tabelas usadas: `associadoitem`, `associado`
- Colunas usadas: `associado.id_produto`, `associado.qtdembalagem`; `associadoitem.id_associado`, `associadoitem.id_produto`, `associadoitem.qtdembalagem`, `associadoitem.percentualcustoestoque`, `associadoitem.aplicaestoque`
- Joins/filtros importantes: `JOIN associado ass ON ass.id = ai.id_associado`; `WHERE ai.aplicaestoque = 't' AND ass.id_produto = $1`
- Risco de reaproveitamento: alto. A semantica de produto associado impacta estoque, custo e fator de conversao.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar quando o estoque deve sair do produto principal e quando deve sair do produto associado.

## Q10 - Parametros fiscais e de custo do produto

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/products.ts`
- Feature relacionada: troca, consumo, balanco, producao e engine de estoque
- Objetivo da query: obter situacao cadastral, estoque, custos e parametros fiscais usados na gravacao das operacoes
- Tabelas usadas: `produto`, `tipopiscofins`, `produtoaliquota`, `aliquota`, `produtocomplemento`
- Colunas usadas: `produto.id_tipopiscofinscredito`; `tipopiscofins.valorpis`, `tipopiscofins.valorcofins`; `produtoaliquota.id_aliquotacreditocusto`; `aliquota.porcentagemfinal`; `produtocomplemento.id_situacaocadastro`, `custosemimposto`, `custocomimposto`, `customediosemimposto`, `customediocomimposto`, `estoque`, `valoripi`, `valoricmssubstituicao`
- Joins/filtros importantes: joins por `id_produto` e `id_aliquotacreditocusto`; `WHERE p.id = $1 AND pc.id_loja = $2`; calculos de `piscofins`, `valorbasepiscofins`, `valorpis` e `valorcofins`
- Risco de reaproveitamento: alto. A regra fiscal esta fortemente acoplada ao modelo do ERP.
- Recomendacao: adaptar
- Pendencia de dominio: validar diferenca entre `id_tipopiscofins` e `id_tipopiscofinscredito` e quais campos fiscais ainda sao obrigatorios na API nova.

## Q11 - Status ativo do produto por loja

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/products.ts`
- Feature relacionada: validacao de producao
- Objetivo da query: verificar se o produto segue ativo na loja antes da gravacao
- Tabelas usadas: `produtocomplemento`
- Colunas usadas: `id_produto`, `id_loja`, `id_situacaocadastro`
- Joins/filtros importantes: `WHERE id_produto = $1 AND id_loja = $2 LIMIT 1`; cast `id_situacaocadastro::boolean`
- Risco de reaproveitamento: baixo
- Recomendacao: adaptar

## Q12 - Auditoria em logtransacao

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/logTransacao.ts`
- Feature relacionada: troca, consumo, producao e balanco
- Objetivo da query: registrar uma trilha padrao de transacao no ERP
- Tabelas usadas: `logtransacao`, com dependencia indireta de `versao` via Q01
- Colunas usadas: `id_loja`, `referencia`, `id_formulario`, `id_tipotransacao`, `observacao`, `datahora`, `id_usuario`, `datamovimento`, `ipterminal`, `versao`, `id_referencia`, `alteracao`
- Joins/filtros importantes: sem join; `ipterminal` sempre gravado como `'/' || ipTerminal`
- Risco de reaproveitamento: medio. A escrita e simples, mas depende de codigos de formulario e tipo de transacao que hoje estao hard-coded.
- Recomendacao: adaptar
- Pendencia de dominio: consolidar o significado dos codigos `id_formulario` e `id_tipotransacao` antes de migrar qualquer feature.

## Q13 - Insercao de ruptura

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/administrativo/ruptura.ts`
- Feature relacionada: ruptura
- Objetivo da query: inserir observacoes de ruptura por prateleira e produto
- Tabelas usadas: `rupturacoletor`
- Colunas usadas: `prateleira`, `id_produto`, `data`, `id_loja`
- Joins/filtros importantes: nao ha join; a SQL e montada por interpolacao direta de strings e listas
- Risco de reaproveitamento: alto. Ha risco de SQL malformada, ausencia de parametros preparados e `ROLLBACK` sem `BEGIN` explicito.
- Recomendacao: substituir por endpoint novo
- Pendencia de dominio: o contrato usa o campo `prateleita`, mas a coluna gravada e `prateleira`; confirmar se e apenas typo do DTO legado.

## Q14 - Upsert de item de balanco

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/balanco.ts`
- Feature relacionada: balanco
- Objetivo da query: somar ou inserir quantidade contada em `balancoestoque`
- Tabelas usadas: `balancoestoque`, com dependencia indireta de `produtocomplemento` e tabelas fiscais via Q10
- Colunas usadas: `balancoestoque.id_loja`, `id_balanco`, `id_produto`, `quantidade`, `custosemimposto`, `custocomimposto`, `id_tipobalancoestoque`, `customediocomimposto`, `customediosemimposto`, `quantidaderecontagem`, `quantidadeconferencia`, `posicaoestoquecongelamento`
- Joins/filtros importantes: a propria query faz busca anterior por `id_balanco` e `id_produto`; grava `id_tipobalancoestoque = 0`
- Risco de reaproveitamento: alto. A regra de agregacao e importante, mas a SQL e uma `DO $$` interpolada com regras de dominio embutidas.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar se `id_tipobalancoestoque = 0` ainda significa `importado` e se a soma de leituras repetidas deve continuar ocorrendo no backend.

## Q15 - Situacao do balanco

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/balanco.ts`
- Feature relacionada: balanco
- Objetivo da query: impedir gravacao em balanco finalizado ou excluido
- Tabelas usadas: `balanco`
- Colunas usadas: `id`, `id_loja`, `id_situacaobalanco`
- Joins/filtros importantes: `WHERE id = $1 AND id_loja = $2`
- Risco de reaproveitamento: baixo
- Recomendacao: adaptar
- Pendencia de dominio: mapear oficialmente os estados de `id_situacaobalanco` usados pelo ERP.

## Q16 - Listagem de balancos por loja

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/balanco.ts`
- Feature relacionada: sync de balancos
- Objetivo da query: listar balancos abertos ou historicos visiveis na loja
- Tabelas usadas: `balanco`, `tipoestoquebalanco`
- Colunas usadas: `balanco.id`, `balanco.id_loja`, `balanco.descricao`, `balanco.id_situacaobalanco`, `balanco.id_tipoestoquebalanco`; `tipoestoquebalanco.descricao`
- Joins/filtros importantes: `JOIN tipoestoquebalanco teb ON teb.id = b.id_tipoestoquebalanco`; `WHERE b.id_loja = $1`
- Risco de reaproveitamento: baixo
- Recomendacao: adaptar

## Q17 - Flag de estoque congelado

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: engine de estoque compartilhada
- Objetivo da query: descobrir se a loja esta operando com estoque congelado
- Tabelas usadas: `parametrovalor`, `parametro`
- Colunas usadas: `parametro.id`, `parametro.descricao`; `parametrovalor.id_parametro`, `parametrovalor.id_loja`, `parametrovalor.valor`
- Joins/filtros importantes: `JOIN parametro p ON p.id = pv.id_parametro`; `WHERE p.descricao = 'Estoque Congelado' AND id_loja = $1`; cast `valor::boolean`
- Risco de reaproveitamento: medio. O comportamento e central, mas depende do cadastro parametrico do ERP.
- Recomendacao: adaptar
- Pendencia de dominio: validar se o nome textual do parametro e estavel e se o cast para boolean cobre todos os valores reais do banco.

## Q18 - Insercao em estoque congelado

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: troca, consumo e producao quando o estoque esta congelado
- Objetivo da query: registrar uma movimentacao pendente em `estoquecongelado` sem mexer no estoque atual
- Tabelas usadas: `estoquecongelado`
- Colunas usadas: `id_produto`, `id_loja`, `id_tipomovimentacao`, `quantidade`, `baixareceita`, `baixaassociado`, `baixaperda`, `observacao`, `custocomimposto`, `customediocomimposto`, `custosemimposto`, `customediosemimposto`, `data`, `id_estoquecongeladotipoentradasaida`, `id_venda`
- Joins/filtros importantes: sem join; custos sao sempre zerados; `data = NOW()::date`
- Risco de reaproveitamento: medio. A estrutura e simples, mas o significado do tipo entrada/saida precisa validacao.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar o significado de `id_estoquecongeladotipoentradasaida` e quando `baixaassociado` deve ser `true`.

## Q19 - Log de movimentacao em estoque

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: troca, consumo e producao quando o estoque nao esta congelado
- Objetivo da query: registrar historico de movimentacao em `logestoque`
- Tabelas usadas: `logestoque`
- Colunas usadas: `id_loja`, `id_produto`, `quantidade`, `id_tipomovimentacao`, `datahora`, `id_usuario`, `observacao`, `estoqueanterior`, `estoqueatual`, `id_tipoentradasaida`, `custosemimposto`, `custocomimposto`, `datamovimento`, `customediocomimposto`, `customediosemimposto`, `id_venda`
- Joins/filtros importantes: sem join; `estoqueatual` e calculado em memoria conforme `idInOrOut`
- Risco de reaproveitamento: medio. A ideia de log e valida, mas precisa virar servico consistente e idempotente.
- Recomendacao: adaptar

## Q20 - Atualizacao de estoque do produto

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: troca, consumo e producao quando o estoque nao esta congelado
- Objetivo da query: aplicar o novo saldo de estoque na loja
- Tabelas usadas: `produtocomplemento`
- Colunas usadas: `estoque`, `id_loja`, `id_produto`
- Joins/filtros importantes: `WHERE id_loja = $2 AND id_produto = $3`
- Risco de reaproveitamento: medio. E uma escrita simples, mas nao pode ficar solta fora de uma transacao de dominio.
- Recomendacao: adaptar

## Q21 - Log de alteracao de custo

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: producao
- Objetivo da query: registrar alteracao de custo e custo medio em `logcusto`
- Tabelas usadas: `logcusto`
- Colunas usadas: `id_produto`, `custosemimpostoanterior`, `custosemimposto`, `custocomimpostoanterior`, `custocomimposto`, `datahora`, `id_usuario`, `id_loja`, `datamovimento`, `observacao`, `customediosemimposto`, `customediocomimposto`, `customediocomimpostoanterior`, `customediosemimpostoanterior`, `valoripi`, `valoricmssubstituicao`, `valoricms`, `valorpiscofins`, `valoracrescimo`, `valoracrescimoimposto`, `custonota`, `percentualperda`, `valordesconto`, `valordescontoimposto`, `valorbonificacao`, `valorverba`, `valoroutrassubstituicao`, `valordespesafrete`, `valorfcp`, `valorfcpsubstituicao`
- Joins/filtros importantes: sem join; varios campos fiscais sao gravados como zero
- Risco de reaproveitamento: alto. O log esta incompleto e ha indicio de mapeamento incorreto no payload inserido.
- Recomendacao: adaptar
- Pendencia de dominio: revisar se o valor enviado para `custosemimpostoanterior` deveria mesmo ser `customediosemimpostoanterior`; o legado parece misturar custo e custo medio nesse insert.

## Q22 - Atualizacao de custo no produto da loja

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/estoque.ts`
- Feature relacionada: producao
- Objetivo da query: persistir novo custo unitario e custo medio em `produtocomplemento`
- Tabelas usadas: `produtocomplemento`
- Colunas usadas: `custosemimposto`, `custocomimposto`, `custosemimpostoanterior`, `custocomimpostoanterior`, `customediocomimposto`, `customediosemimposto`, `customediocomimpostoanterior`, `customediosemimpostoanterior`, `id_loja`, `id_produto`
- Joins/filtros importantes: `WHERE id_loja = $9 AND id_produto = $10`
- Risco de reaproveitamento: alto. A escrita afeta apuracao de custo do ERP e precisa ser isolada em um servico confiavel.
- Recomendacao: adaptar

## Q23 - Upsert de consumo diario

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/consumo.ts`
- Feature relacionada: consumo
- Objetivo da query: somar consumo do dia por produto, loja e tipo de consumo
- Tabelas usadas: `tipoconsumo`, `consumo`, com dependencia indireta de `produtocomplemento` e tabelas fiscais via Q10
- Colunas usadas: `tipoconsumo.emitenota`; `consumo.id_loja`, `id_produto`, `data`, `id_tipoconsumo`, `quantidade`, `custocomimposto`, `custosemimposto`, `id_aliquotacredito`, `piscofins`, `id_tipopiscofins`, `observacao`, `customediocomimposto`, `customediosemimposto`, `valoripi`, `valoricmssubstituicao`, `id_notasaida`, `valorbasepiscofins`, `valorpis`, `valorcofins`, `emitenota`
- Joins/filtros importantes: busca `emitenota` por `tipoconsumo`; faz upsert manual por `id_loja`, `id_produto`, `NOW()::date`, `id_tipoconsumo`
- Risco de reaproveitamento: alto. A regra de consolidacao diaria e relevante, mas a SQL interpolada e acoplada ao modelo fiscal do ERP.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar se a consolidacao diaria por tipo de consumo deve continuar no backend novo ou se cada evento deve ser preservado individualmente.

## Q24 - Query monolitica de consumo

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/consumo.ts`
- Feature relacionada: consumo
- Objetivo da query: executar em um unico bloco a baixa de estoque, `logtransacao` e `consumo`
- Tabelas usadas: `associado`, `associadoitem`, `produtocomplemento`, `produto`, `tipopiscofins`, `produtoaliquota`, `aliquota`, `tipoconsumo`, `versao`, `parametrovalor`, `parametro`, `estoquecongelado`, `logestoque`, `logtransacao`, `consumo`
- Colunas usadas: combina as colunas ja descritas em Q01, Q09, Q10, Q17, Q18, Q19, Q12 e Q23
- Joins/filtros importantes: bloco `DO $$` com regras hard-coded para `id_tipomovimentacao = 11`, `id_formulario = 9` e usuario `66`
- Risco de reaproveitamento: muito alto. A funcao nao e usada pelas rotas atuais e concentra varias responsabilidades em uma SQL interpolada.
- Recomendacao: substituir por endpoint novo
- Pendencia de dominio: confirmar a origem e o papel do usuario fixo `66`, hoje descrito em comentarios como `COLETORM`.

## Q25 - Registro de troca do produto

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/troca.ts`
- Feature relacionada: troca
- Objetivo da query: registrar a entrada no estoque de troca e atualizar o saldo de `troca`
- Tabelas usadas: `produtocomplemento`, `logtroca`, com dependencia indireta de `produtocomplemento` e tabelas fiscais via Q10
- Colunas usadas: `produtocomplemento.troca`; `logtroca.id_loja`, `id_produto`, `quantidade`, `datahora`, `id_usuario`, `estoqueanterior`, `estoqueatual`, `id_tipoentradasaida`, `datamovimento`, `id_motivotroca`, `observacaotroca`, `custosemimposto`, `custocomimposto`, `customediosemimposto`, `customediocomimposto`
- Joins/filtros importantes: busca saldo anterior de `troca` por produto/loja; grava `id_tipoentradasaida = 0`; atualiza `produtocomplemento.troca`
- Risco de reaproveitamento: alto. A regra de negocio e importante, mas a escrita atual e uma SQL interpolada com codigos magicos.
- Recomendacao: adaptar
- Pendencia de dominio: validar se `id_tipoentradasaida = 0` e a regra correta para movimentacao de troca.

## Q26 - Query monolitica de troca

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/troca.ts`
- Feature relacionada: troca
- Objetivo da query: executar em um unico bloco a baixa de estoque, `logtroca`, `logtransacao` e saldo de `troca`
- Tabelas usadas: `associado`, `associadoitem`, `produtocomplemento`, `versao`, `parametrovalor`, `parametro`, `estoquecongelado`, `logestoque`, `logtroca`, `logtransacao`
- Colunas usadas: combina as colunas ja descritas em Q01, Q09, Q17, Q18, Q19, Q12 e Q25
- Joins/filtros importantes: bloco `DO $$` com regras hard-coded para `id_tipomovimentacao = 18`, `id_formulario = 196` e usuario `66`
- Risco de reaproveitamento: muito alto. A funcao tambem nao e usada pelas rotas atuais e duplica a engine de estoque fora do fluxo principal.
- Recomendacao: substituir por endpoint novo

## Q27 - Itens da receita para producao

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`
- Feature relacionada: producao
- Objetivo da query: calcular insumos usados e custos proporcionais da receita
- Tabelas usadas: `receitaitem`, `receitaproduto`, `produtocomplemento`
- Colunas usadas: `receitaitem.id_produto`, `qtdembalagemreceita`, `qtdembalagemproduto`, `fatorconversao`, `baixaestoque`; `receitaproduto.id_receita`, `id_produto`, `rendimento`; `produtocomplemento.customediocomimposto`, `customediosemimposto`, `id_loja`
- Joins/filtros importantes: `JOIN receitaproduto rp ON rp.id_receita = ri.id_receita`; `JOIN produtocomplemento pc ON pc.id_produto = ri.id_produto`; `WHERE rp.id_produto = $2 AND ri.baixaestoque = true AND pc.id_loja = $3`
- Risco de reaproveitamento: alto. A regra de producao depende de rendimento, conversao e custo medio.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar se `fatorconversao` deveria participar da conta final; no legado ele e lido, mas nao participa da gravacao posterior.

## Q28 - Gravacao de producao e itens produzidos

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`
- Feature relacionada: producao
- Objetivo da query: inserir cabecalho de producao e os itens da receita usados
- Tabelas usadas: `produto`, `tipopiscofins`, `produtoaliquota`, `aliquota`, `produtocomplemento`, `producao`, `producaoitem`, `receitaitem`, `receitaproduto`, `producao_id_seq`
- Colunas usadas: `produto.id_tipopiscofins`; `tipopiscofins.valorpis`, `valorcofins`; `produtoaliquota.id_aliquotacredito`, `id_aliquotadebito`, `id_aliquotacreditocusto`; `produtocomplemento.custocomimposto`, `customediocomimposto`, `id_loja`; `producao.id_loja`, `data`, `id_produto`, `quantidade`, `custocomimposto`, `id_aliquotacredito`, `id_aliquotadebito`, `piscofins`, `customediocomimposto`; `producaoitem.id_producao`, `id_produto`, `qtdembalagemproducao`, `qtdembalagemproduto`
- Joins/filtros importantes: `WHERE pc.id_loja = ${idLoja} AND p.id = ${idProduto}`; busca itens por `id_receita = (SELECT id_receita FROM receitaproduto WHERE id_produto = ...)`; usa `SELECT last_value FROM producao_id_seq`
- Risco de reaproveitamento: muito alto. Ha dependencia de sequence global e a SQL esta interpolada.
- Recomendacao: adaptar
- Pendencia de dominio: validar se `last_value FROM producao_id_seq` e seguro no banco alvo e se a API nova deve continuar gravando `producaoitem` desse modo.

## Q29 - Receitas disponiveis por loja

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`
- Feature relacionada: sync de producao
- Objetivo da query: listar receitas ativas da loja para o mobile
- Tabelas usadas: `receita`, `receitaproduto`, `receitaloja`
- Colunas usadas: `receita.id`, `receita.descricao`, `receitaproduto.id_produto`, `receitaloja.id_receita`, `receitaloja.id_loja`, `id_situacaocadastro`
- Joins/filtros importantes: `JOIN receitaproduto rp ON rp.id_receita = r.id`; `JOIN receitaloja rl ON rl.id_receita = r.id`; `WHERE id_situacaocadastro = 1 AND rl.id_loja = $1`
- Risco de reaproveitamento: medio. A leitura e util, mas o filtro de situacao nao esta qualificado.
- Recomendacao: adaptar
- Pendencia de dominio: confirmar de qual tabela vem `id_situacaocadastro` e qual significado operacional define uma receita sincronizavel.

## Q30 - Idempotencia: tentativa de aquisicao

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`
- Feature relacionada: transmissao de balanco
- Objetivo da query: criar um registro `in_progress` para uma chave de idempotencia
- Tabelas usadas: `pdtconnect.api_idempotency`
- Colunas usadas: `endpoint`, `idem_key`, `request_hash`, `status`, `created_at`, `updated_at`
- Joins/filtros importantes: `ON CONFLICT (endpoint, idem_key) DO NOTHING`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar
- Observacao: tabela auxiliar do sistema, fora do VRMaster.

## Q31 - Idempotencia: leitura de estado existente

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`
- Feature relacionada: transmissao de balanco
- Objetivo da query: recuperar hash, status e resposta anterior para replay ou conflito
- Tabelas usadas: `pdtconnect.api_idempotency`
- Colunas usadas: `request_hash`, `status`, `response_code`, `response_body`, `endpoint`, `idem_key`
- Joins/filtros importantes: `WHERE endpoint = $1 AND idem_key = $2`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar
- Observacao: tabela auxiliar do sistema, fora do VRMaster.

## Q32 - Idempotencia: reabrir tentativa falha

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`
- Feature relacionada: transmissao de balanco
- Objetivo da query: trocar status de `failed` para `in_progress` quando `allowRetryOnFailed = true`
- Tabelas usadas: `pdtconnect.api_idempotency`
- Colunas usadas: `status`, `updated_at`, `endpoint`, `idem_key`
- Joins/filtros importantes: `WHERE endpoint = $1 AND idem_key = $2`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar
- Observacao: tabela auxiliar do sistema, fora do VRMaster.

## Q33 - Idempotencia: persistir resposta concluida

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`
- Feature relacionada: transmissao de balanco
- Objetivo da query: salvar a resposta HTTP para replay de chamadas repetidas
- Tabelas usadas: `pdtconnect.api_idempotency`
- Colunas usadas: `status`, `response_code`, `response_body`, `updated_at`, `endpoint`, `idem_key`
- Joins/filtros importantes: `response_body = $4::jsonb`; `WHERE endpoint = $1 AND idem_key = $2`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar
- Observacao: tabela auxiliar do sistema, fora do VRMaster.

## Q34 - Idempotencia: marcar falha interna

- Arquivo de origem: `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`
- Feature relacionada: transmissao de balanco
- Objetivo da query: registrar erro interno para permitir replay controlado
- Tabelas usadas: `pdtconnect.api_idempotency`
- Colunas usadas: `status`, `response_code`, `response_body`, `updated_at`, `endpoint`, `idem_key`
- Joins/filtros importantes: `response_body = $3::jsonb`; `WHERE endpoint = $1 AND idem_key = $2`
- Risco de reaproveitamento: baixo
- Recomendacao: reaproveitar
- Observacao: tabela auxiliar do sistema, fora do VRMaster.

## Pendencias de dominio consolidadas

- Confirmar a regra de produto decimal baseada em `id_tipoembalagem IN (4, 6, 9)`.
- Confirmar a semantica de `produto associado` e a formula de conversao de quantidade/custo.
- Mapear oficialmente os codigos de `id_formulario`, `id_tipotransacao`, `id_tipomovimentacao`, `id_tipoentradasaida` e `id_tipobalancoestoque`.
- Confirmar quando a consolidacao diaria em `consumo` e o incremento cumulativo em `balancoestoque` devem continuar existindo.
- Confirmar a regra de `estoque congelado` e os tipos de entrada/saida gravados em `estoquecongelado`.
- Confirmar a origem correta de `id_situacaocadastro` nas consultas de receita e o papel de `fatorconversao` em producao.
- Confirmar o papel do usuario fixo `66` nas queries monoliticas legadas.
