# VRMaster Tabelas Relevantes Mobile

## Objetivo

Este catalogo descreve as tabelas relevantes para o mobile legado de forma funcional. A intencao nao e espelhar o schema inteiro, mas deixar claro qual papel cada tabela cumpria nas features e quais colunas realmente aparecem nas regras encontradas no codigo.

## Catalogos operacionais

| Tabela | Papel na feature | Colunas que importam para o mobile | Observacoes de negocio |
| --- | --- | --- | --- |
| `loja` | Selecao de loja e contexto do sync | `id`, `descricao` | O mobile antigo sincronizava a lista inteira de lojas e depois escolhia uma `id_currentstore` local. |
| `tipoembalagem` | Exibicao de unidade e apoio a regra de item decimal | `id`, `descricao`, `descricaocompleta` | O legado tambem usava `id_tipoembalagem` para inferir se um produto aceita decimal. |
| `tipomotivotroca` | Motivos de lancamento de troca | `id`, `descricao`, `id_situacaocadastro` | Apenas registros ativos eram sincronizados. |
| `tipoconsumo` | Motivos de consumo e eventual emissao de nota | `id`, `descricao`, `id_situacaocadastro`, `emitenota` | `emitenota` impacta a gravacao do `consumo` e precisa ser preservado na API nova. |
| `tipomotivoquebra` | Catalogo futuro para rotina de quebra | `id`, `descricao`, `id_situacaocadastro` | Nao havia transmissao de quebra nas rotas analisadas, mas o backend antigo ja expunha o catalogo. |
| `tipomotivoperda` | Catalogo futuro para rotina de perda | `id`, `descricao`, `id_situacaocadastro` | Mesmo caso de quebra: catalogo existe, mas a feature nao apareceu nas rotas atuais. |
| `versao` | Auditoria de transmissao | `id_programa`, `versao` | O legado consulta `id_programa = 0` para preencher `logtransacao`. Pendencia de dominio: validar o significado exato desse programa. |

## Produto, custo e estoque

| Tabela | Papel na feature | Colunas que importam para o mobile | Observacoes de negocio |
| --- | --- | --- | --- |
| `produto` | Cadastro mestre de produto | `id`, `descricaocompleta`, `pesobruto`, `permitequebra`, `permiteperda`, `id_tipoembalagem`, `id_tipopiscofins`, `id_tipopiscofinscredito` | O mobile nunca usa `produto` sozinho; sempre depende do complemento por loja. |
| `produtocomplemento` | Estado do produto por loja | `id_produto`, `id_loja`, `id_situacaocadastro`, `precovenda`, `estoque`, `troca`, `custosemimposto`, `custocomimposto`, `customediosemimposto`, `customediocomimposto`, `custosemimpostoanterior`, `custocomimpostoanterior`, `customediosemimpostoanterior`, `customediocomimpostoanterior`, `valoripi`, `valoricmssubstituicao`, `fabricacaopropria` | E a tabela mais critica para o mobile. Quase toda rotina operacional consulta ou altera campos dela. |
| `produtoautomacao` | Codigo de barras e embalagem comercial | `id_produto`, `codigobarras`, `qtdembalagem`, `id_tipoembalagem` | O sync antigo usava essa tabela para montar a busca offline por codigo de barras. |
| `associado` | Produto principal em relacao de estoque associado | `id`, `id_produto`, `qtdembalagem` | Usado para descobrir quando uma baixa deve ocorrer em outro item, nao necessariamente no mesmo produto selecionado. |
| `associadoitem` | Item associado que sofre a movimentacao real | `id_associado`, `id_produto`, `qtdembalagem`, `percentualcustoestoque`, `aplicaestoque` | Regra sensivel. Pendencia de dominio: confirmar a formula de conversao de quantidade e custo. |
| `tipopiscofins` | Percentuais fiscais usados em custo e lancamentos | `id`, `valorpis`, `valorcofins` | Alimenta calculos de `piscofins`, `valorpis` e `valorcofins`. |
| `produtoaliquota` | Vinculo do produto com aliquotas fiscais | `id_produto`, `id_aliquotacreditocusto`, `id_aliquotacredito`, `id_aliquotadebito` | A query de custo usa campos diferentes conforme a feature; isso precisa ser consolidado no backend novo. |
| `aliquota` | Percentual fiscal aplicado no calculo de base | `id`, `porcentagemfinal` | Entra em formulas de `valorbasepiscofins`, `valorpis` e `valorcofins`. |
| `parametro` | Cadastro textual de parametros do ERP | `id`, `descricao` | O legado localiza `Estoque Congelado` por descricao literal. |
| `parametrovalor` | Valor do parametro por loja | `id_parametro`, `id_loja`, `valor` | `valor` e convertido para boolean na regra de estoque congelado. Pendencia de dominio: validar representacao real dos valores. |

## Movimentacoes operacionais e auditoria

| Tabela | Papel na feature | Colunas que importam para o mobile | Observacoes de negocio |
| --- | --- | --- | --- |
| `estoquecongelado` | Fila de movimentos quando o estoque esta congelado | `id_produto`, `id_loja`, `id_tipomovimentacao`, `quantidade`, `baixareceita`, `baixaassociado`, `baixaperda`, `observacao`, `custocomimposto`, `customediocomimposto`, `custosemimposto`, `customediosemimposto`, `data`, `id_estoquecongeladotipoentradasaida`, `id_venda` | O legado grava custos zerados quando o estoque esta congelado. Isso precisa validacao funcional antes de migrar. |
| `logestoque` | Historico de baixa/entrada de estoque | `id_loja`, `id_produto`, `quantidade`, `id_tipomovimentacao`, `datahora`, `id_usuario`, `observacao`, `estoqueanterior`, `estoqueatual`, `id_tipoentradasaida`, `custosemimposto`, `custocomimposto`, `datamovimento`, `customediocomimposto`, `customediosemimposto`, `id_venda` | E o rastro principal da engine de estoque. |
| `logcusto` | Historico de alteracao de custo | `id_produto`, `custosemimpostoanterior`, `custosemimposto`, `custocomimpostoanterior`, `custocomimposto`, `datahora`, `id_usuario`, `id_loja`, `datamovimento`, `observacao`, `customediosemimposto`, `customediocomimposto`, `customediocomimpostoanterior`, `customediosemimpostoanterior` | O insert legado preenche varios campos fiscais com zero e merece revisao antes de qualquer reaproveitamento. |
| `logtransacao` | Auditoria transversal de operacoes | `id_loja`, `referencia`, `id_formulario`, `id_tipotransacao`, `observacao`, `datahora`, `id_usuario`, `datamovimento`, `ipterminal`, `versao`, `id_referencia`, `alteracao` | Presente em troca, consumo, producao e balanco. Os codigos de formulario e tipo precisam catalogo oficial. |
| `consumo` | Consolidacao diaria de consumo | `id_loja`, `id_produto`, `data`, `id_tipoconsumo`, `quantidade`, `custocomimposto`, `custosemimposto`, `id_aliquotacredito`, `piscofins`, `id_tipopiscofins`, `customediocomimposto`, `customediosemimposto`, `valoripi`, `valoricmssubstituicao`, `valorbasepiscofins`, `valorpis`, `valorcofins`, `emitenota`, `id_notasaida` | O legado soma consumos do mesmo dia por produto e tipo. Pendencia de dominio: confirmar se esse agregado diario deve continuar existindo. |
| `logtroca` | Historico do estoque de troca | `id_loja`, `id_produto`, `quantidade`, `datahora`, `id_usuario`, `estoqueanterior`, `estoqueatual`, `id_tipoentradasaida`, `datamovimento`, `id_motivotroca`, `observacaotroca`, `custosemimposto`, `custocomimposto`, `customediosemimposto`, `customediocomimposto` | A rotina de troca mexe em `estoque` e tambem em `troca`; ambas as trilhas precisam ser preservadas no backend novo. |
| `balanco` | Cabecalho do inventario de estoque | `id`, `id_loja`, `descricao`, `id_situacaobalanco`, `id_tipoestoquebalanco` | O mobile antigo sincroniza a lista de balancos por loja e valida status antes de transmitir. |
| `balancoestoque` | Itens contados no balanco | `id_loja`, `id_balanco`, `id_produto`, `quantidade`, `custosemimposto`, `custocomimposto`, `id_tipobalancoestoque`, `customediocomimposto`, `customediosemimposto`, `quantidaderecontagem`, `quantidadeconferencia`, `posicaoestoquecongelamento` | O legado soma quantidades repetidas em vez de manter eventos separados. |
| `tipoestoquebalanco` | Descricao do tipo de estoque do balanco | `id`, `descricao` | Enriquecimento de leitura para o app. |
| `rupturacoletor` | Registro de ruptura por prateleira | `prateleira`, `id_produto`, `data`, `id_loja` | O legado faz um insert em lote por string interpolada. Nao deve ser copiado como esta. |

## Receitas e producao

| Tabela | Papel na feature | Colunas que importam para o mobile | Observacoes de negocio |
| --- | --- | --- | --- |
| `receita` | Cadastro da receita | `id`, `descricao`, `id_situacaocadastro` | Pendencia de dominio: confirmar se o filtro de ativo realmente vem desta tabela no legado. |
| `receitaproduto` | Vinculo entre receita e produto produzido | `id_receita`, `id_produto`, `rendimento` | Central para calcular insumos consumidos por quantidade produzida. |
| `receitaloja` | Disponibilidade da receita por loja | `id_receita`, `id_loja` | O mobile antigo so sincroniza receitas associadas a loja atual. |
| `receitaitem` | Itens e quantidades da receita | `id_receita`, `id_produto`, `qtdembalagemreceita`, `qtdembalagemproduto`, `fatorconversao`, `baixaestoque` | Pendencia de dominio: `fatorconversao` e lido mas nao e usado diretamente na gravacao final do legado. |
| `producao` | Cabecalho da producao | `id_loja`, `data`, `id_produto`, `quantidade`, `custocomimposto`, `id_aliquotacredito`, `id_aliquotadebito`, `piscofins`, `customediocomimposto` | A producao mexe em estoque dos insumos e no custo medio do produto produzido. |
| `producaoitem` | Itens consumidos pela producao | `id_producao`, `id_produto`, `qtdembalagemproducao`, `qtdembalagemproduto` | O legado preenche usando `last_value` da sequence, o que merece revisao transacional. |
| `producao_id_seq` | Sequence usada para linkar `producao` e `producaoitem` | `last_value` | Nao e tabela de negocio, mas afeta consistencia da feature. |

## Tabela auxiliar fora do VRMaster

| Tabela | Papel na feature | Colunas que importam para o mobile | Observacoes de negocio |
| --- | --- | --- | --- |
| `pdtconnect.api_idempotency` | Idempotencia da transmissao de balanco | `endpoint`, `idem_key`, `request_hash`, `status`, `response_code`, `response_body`, `created_at`, `updated_at` | Nao faz parte do ERP. Mesmo assim, e uma peca importante da migracao porque protege a API de processamento duplicado. |

## Pendencias de dominio

- Confirmar a regra oficial para produto decimal com base em `tipoembalagem`.
- Confirmar a modelagem de `associado` e `associadoitem` para baixa de estoque e custo.
- Confirmar os significados de `id_tipomovimentacao`, `id_tipoentradasaida`, `id_tipobalancoestoque` e `id_situacaobalanco`.
- Confirmar se `consumo` deve seguir consolidado por dia ou passar a armazenar eventos individualizados.
- Confirmar o comportamento esperado de `estoquecongelado` e quando os custos podem ser zerados.
- Confirmar a origem de `id_situacaocadastro` nas consultas de receita e o papel real de `fatorconversao`.
