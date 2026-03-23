# Mobile Producao Migracao

## Fontes revisadas

Arquivos principais do legado analisados:

- `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- `apps/mobile_old/mobile_front/components/ModalMessage.tsx`
- `apps/mobile_old/mobile_front/components/NumberInput.tsx`
- `apps/mobile_old/mobile_front/components/StdButton.tsx`
- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile_old/mobile_front/database/migrations/1.ts`
- `apps/mobile_old/mobile_front/constants/ScreensConfig.tsx`
- `apps/mobile_old/mobile_backend/src/syncronize/index.ts`
- `apps/mobile_old/mobile_backend/src/transmit/index.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`

Arquivos do app novo usados para comparação arquitetural:

- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-collect-screen.tsx`
- `apps/mobile/src/features/consumo/components/consumo-screen.tsx`
- `apps/mobile/src/features/consumo/components/consumo-collect-screen.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-reason-modal.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-metric-field.tsx`
- `apps/mobile/src/features/shared/operational-entry/components/transmission-header.tsx`
- `apps/mobile/src/features/shared/products/services/product-catalog-sync.ts`
- `apps/mobile/src/features/sync/services/global-sync.service.ts`
- `apps/api/src/mobile-sync/mobile-sync.catalog.service.ts`

## Estrutura da rotina antiga de producao

### Tela principal unica

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx`

Responsabilidades:

- listar os lancamentos locais de `logproducao`
- exibir `Ultima Sincronizacao` e botao `Transmitir`
- permitir exclusao por swipe via `TransmissionList`
- abrir um modal de cadastro ao tocar no FAB `+`
- selecionar a receita nesse modal
- informar a quantidade produzida no mesmo modal
- salvar direto em `logproducao`
- transmitir os pendentes para `/transmit/lancamentoproducao`

Importante:

- no legado nao existe uma segunda tela de coleta como acontece em troca e consumo
- a experiencia de producao e mais compacta: lista principal + modal de cadastro

### Componentes compartilhados do legado usados por producao

- `TransmissionList.tsx`: lista com swipe para excluir e faixa de status
- `ModalMessage.tsx`: modal base
- `StdButton.tsx`: botoes principais e FAB
- `NumberInput.tsx`: input numerico com suporte a decimal
- `DropDownPicker`: seletor pesquisavel de receita
- `ExportTxtData`: exportacao do log local no header

## Fluxo funcional completo do legado

1. Abrir `transmissionScreen`
2. Carregar `conprops`, `receita` e `logproducao`
3. Mostrar lista de lancamentos locais da loja atual
4. Tocar no FAB `+`
5. Abrir modal `PRODUCAO`
6. Selecionar a receita no dropdown pesquisavel
7. Informar a quantidade produzida
8. Confirmar com `OK`
9. Salvar em `logproducao`
10. Permanecer na tela principal, com o modal pronto para novo cadastro
11. Tocar em `Transmitir` quando quiser enviar os pendentes
12. Marcar como transmitidos os lancamentos conciliados pela resposta do backend

## Campos e parametros identificados

### Catalogo de receitas local

Tabela local do legado:

- `receita`

Campos sincronizados:

- `id`
- `descricao`
- `id_produto`

Observacao:

- o dropdown da tela monta o label como `id_produto || ' - ' || descricao`
- o campo `decimal` nao vem da tabela `receita`; ele e obtido por join com `produto`

### Lancamento local

Tabela local do legado:

- `logproducao`

Campos:

- `id`
- `id_loja`
- `id_receita`
- `id_tipoentradasaida`
- `quantidade`
- `transmitido`

Observacao importante:

- apesar de existir `id_tipoentradasaida`, a tela de producao sempre grava `0`
- na pratica, producao no legado e um fluxo so de entrada

### Payload de transmissao legado

O app antigo transmite para `/transmit/lancamentoproducao` com:

- `idLoja`
- `idProduto`
- `quantidade`
- `ipTerminal`
- `idUser`

Ponto importante:

- o mobile salva `id_receita` localmente
- mas transmite `idProduto` do produto produzido, obtido via join com `receita`

## Regras de negocio percebidas

### No mobile legado

- so salva se houver receita selecionada e `quantidade > 0`
- a quantidade aceita decimal conforme o produto produzido da receita
- o modal reabre ja focado no seletor apos salvar, favorecendo lancamentos em sequencia
- exclusao e direta sobre `logproducao`
- transmissao considera apenas `transmitido = 0`

### No backend legado

Arquivo:

- `apps/mobile_old/mobile_backend/src/database/queries/estoque/producao.ts`

Comportamento observado:

- valida se o produto produzido esta ativo
- resolve os itens da receita via `receitaitem`, `receitaproduto` e `receitaloja`
- baixa estoque dos ingredientes marcados com `baixaestoque = true`
- calcula custos usados e custo medio do item produzido
- gera movimento de estoque de saida para os ingredientes
- gera movimento de entrada para o produto produzido
- insere `producao` e `producaoitem`
- registra log de transacao do produto produzido

Conclusao:

- a logica pesada de composicao da receita e custo fica no servidor
- o mobile antigo captura apenas `produto produzido + quantidade`

## Dependencias de sync e catalogo no legado

O sync antigo inclui:

- `produto`
- `receita`
- `loja`
- outros catalogos de estoque

Arquivos:

- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile_old/mobile_backend/src/syncronize/index.ts`

Filtro de receitas no backend antigo:

- `receitaloja.id_loja = $1`
- `receita.id_situacaocadastro = 1`

Conclusao:

- receita e dependente da loja atual
- o catalogo de producao nao e global; ele e escopado por loja

## Status de transmissao e exclusao no legado

Status local:

- `transmitido = 0`: pendente
- `transmitido = 1`: transmitido

Visualmente:

- a lista usa o mesmo padrao operacional das outras rotinas do legado
- exclusao acontece por swipe usando `TransmissionList`

Fragilidade herdada:

- o legado concilia transmissao pela lista de `idProduto` retornada pelo backend
- isso e fragil quando existem varios lancamentos do mesmo produto produzido

## Uso de scanner no legado

Nao encontrei uso de scanner nem `ProductInput.tsx` na rotina antiga de producao.

Conclusao pratica:

- producao no legado nao e uma rotina de busca por produto
- ela e uma rotina de selecao de receita
- scanner nao deve ser assumido como parte obrigatoria da primeira migracao

## Diferencas funcionais em relacao a ruptura, troca e consumo

### Em relacao a ruptura

- producao nao trabalha com prateleira
- nao tem coleta continua
- nao tem duplicidade silenciosa por prateleira + produto
- nao usa scanner como eixo principal

### Em relacao a troca e consumo

- nao usa produto como entidade de entrada; usa receita
- nao tem tela separada de coleta
- nao tem `Adicionar / Remover`
- nao tem validacao de saldo pendente ao remover
- nao depende de motivo ou tipo; depende de receita
- transmite o produto produzido, nao o motivo

### Similaridade real com as outras rotinas

- shell de lista/transmissao
- persistencia local de lancamentos
- exclusao por swipe
- botao `Transmitir`
- FAB para abrir cadastro
- dependencia da loja atual
- catalogo local sincronizado

## Estado atual no app novo

Hoje no app novo:

- ruptura, troca e consumo ja existem
- producao ainda nao existe como feature
- em `apps/mobile/src/features/home/home-navigation.tsx` existe apenas a entrada de navegacao/favorito para `producao`
- o sync global atual ainda nao possui dominio para receitas de producao

Arquivos que evidenciam isso:

- `apps/mobile/src/features/home/home-navigation.tsx`
- `apps/mobile/src/features/mobile-sync/types.ts`
- `apps/mobile/src/features/sync/services/global-sync.service.ts`
- `apps/api/src/mobile-sync/mobile-sync.catalog.service.ts`

## Pontos de atencao para migrar ao app novo

### O que deve ficar fiel ao legado

- lista principal operacional
- botao `Transmitir`
- FAB `+`
- cadastro via modal, nao necessariamente por tela separada
- seletor pesquisavel de receita
- input de quantidade produzida
- exclusao por swipe

### O que nao deve ser portado literalmente

- conciliacao de transmissao por `idProduto`
- dependencia de `ipTerminal` e `idUser` hardcoded no mobile
- SQL e joins de negocio no dispositivo

### Adaptacao recomendada para a base nova

- manter a captura mobile leve: `receita + produto produzido + quantidade`
- deixar a explodir da receita, custos e movimentos de estoque no backend novo
- usar outbox por evento, nao agrupamento fragil
- usar a loja atual do sync global

## Modelagem sugerida para a futura implementacao

### Catalogo de receitas

Dominio novo sugerido:

- `production.recipes`

Tabela local sugerida:

- `production_recipes`

Campos minimos:

- `id`
- `store_id`
- `product_id`
- `description`
- `active_status`
- `synced_at`
- `updated_at`

Observacao:

- o restante dos atributos do produto produzido pode continuar vindo do catalogo compartilhado `stock.products`

### Lancamento local

Tabela local sugerida:

- `production_entries`

Campos minimos:

- `local_id`
- `event_id`
- `user_id`
- `store_id`
- `recipe_id`
- `recipe_description`
- `product_id`
- `product_description`
- `quantity_input`
- `created_at`
- `updated_at`

### Evento mobile sugerido

- `production.item.recorded`

Payload minimo sugerido:

- `recipeId`
- `recipeDescription`
- `productId`
- `productDescription`
- `quantityInput`
- `capturedAt`

## Resumo

Producao no legado nao deve nascer no app novo como uma copia da coleta de troca/consumo.

Ela e, na pratica:

- uma rotina de transmissao com lista local
- um modal de selecao de receita
- um input de quantidade
- uma transmissao idempotente para o servidor processar a receita

Essa diferenca precisa orientar a migracao para evitar uma UI errada e uma generalizacao artificial com troca/consumo.

## Adaptacao implementada no app novo

A rotina nova de producao foi implementada no app atual preservando o fluxo principal do legado:

- lista principal com transmissao
- exclusao por swipe
- FAB para abrir o cadastro
- modal unico para selecionar receita e informar quantidade
- transmissao manual ou automatica pela outbox

### Principais adaptacoes

- o catalogo de receitas agora e sincronizado pelo dominio `production.recipes`
- a loja usada pela producao vem do sync global e da loja atual do app
- o lancamento local vira um evento idempotente `production.item.recorded`
- a explodir da receita, custo e movimento de estoque continuam no backend, nao no mobile

### O que ficou fiel ao legado

- UX de `lista + modal`, sem tela separada de coleta
- selecao de receita antes do lancamento
- campo unico de quantidade produzida
- transmissao e remocao de pendencias

### O que melhorou na base nova

- persistencia offline-first com outbox por evento
- status de transmissao mais robustos
- integracao com parametro global de transmissao automatica
- integracao com tema, safe area e infraestrutura compartilhada das outras rotinas

### Limitacoes atuais

- o modal de receita no app novo ainda nao tem busca textual como o `DropDownPicker` antigo
- nao foi implementado scanner porque ele nao fazia parte do fluxo central da producao no legado
- a validacao visual fina em aparelho Android real ainda depende de teste manual no Expo Go ou build local
