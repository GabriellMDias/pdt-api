# Mobile Consumo Migracao

## Fontes revisadas

Arquivos principais do legado analisados:

- `apps/mobile_old/mobile_front/app/estoque/consumo/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/app/estoque/consumo/[idMotivoConsumo].tsx`
- `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- `apps/mobile_old/mobile_front/components/ProductInput.tsx`
- `apps/mobile_old/mobile_front/components/NumberInput.tsx`
- `apps/mobile_old/mobile_front/components/AddRadio.tsx`
- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile_old/mobile_front/database/migrations/1.ts`

## Estrutura da rotina antiga

### Tela principal

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/consumo/transmissionScreen.tsx`

Responsabilidades:

- listar os lancamentos locais de `logconsumo`
- exibir status `transmitido / nao transmitido / parcialmente transmitido`
- permitir exclusao por swipe via `TransmissionList`
- abrir modal inicial para selecionar o `tipo de consumo`
- navegar para a coleta pelo motivo escolhido
- transmitir os lancamentos pendentes

### Tela de coleta

Arquivo:

- `apps/mobile_old/mobile_front/app/estoque/consumo/[idMotivoConsumo].tsx`

Responsabilidades:

- receber o `idMotivoConsumo` pela rota
- selecionar produto por busca ou scanner
- informar quantidade e embalagem
- calcular total
- alternar entre `Adicionar` e `Remover`
- mostrar dados auxiliares do produto
- salvar um lancamento local em `logconsumo`

### Componentes compartilhados do legado

- `ProductInput.tsx`: busca de produto, sugestoes, scanner, beep de sucesso e erro
- `NumberInput.tsx`: input numerico com mascara decimal automatica antiga
- `AddRadio.tsx`: toggle `Adicionar / Remover`
- `TransmissionList.tsx`: lista principal com swipe para excluir e coluna visual de status
- `ModalMessage.tsx` e `StdButton.tsx`: infraestrutura visual de modal e botoes

## Fluxo funcional completo

1. Abrir `transmissionScreen`
2. Carregar `tipoconsumo` e `logconsumo` da loja atual em `conprops.id_currentstore`
3. Tocar no FAB `+`
4. Abrir modal com `DropDownPicker` para selecionar o motivo de consumo
5. Confirmar e navegar para `/estoque/consumo/[idMotivoConsumo]`
6. Na coleta:
   - buscar produto por descricao, codigo interno ou codigo de barras
   - opcionalmente ler codigo por camera
   - preencher `Quantidade`
   - preencher `Embalagem`
   - visualizar `Total`
   - escolher `Adicionar` ou `Remover`
7. Salvar em `logconsumo`
8. Voltar para a lista principal para transmitir ou remover

## Campos e parametros observados

### Em `logconsumo`

Pelo schema legado:

- `id`
- `codigobarras`
- `id_loja`
- `id_produto`
- `id_tipoentradasaida`
- `id_tipoconsumo`
- `quantidade`
- `transmitido`

### Na coleta

- produto
- quantidade
- embalagem
- total
- quantidade caixa
- peso caixa
- embalagem do produto
- estoque
- preco venda
- preco custo
- coletados
- modo `Adicionar / Remover`

## Validacoes e regras de negocio percebidas

- so salva se houver produto selecionado e `quantidade > 0` e `embalagem > 0`
- `Adicionar` grava `id_tipoentradasaida = 0`
- `Remover` grava `id_tipoentradasaida = 1`
- ao remover, a quantidade negativa nao pode ultrapassar o saldo pendente coletado do mesmo produto no mesmo `id_tipoconsumo`
- se a remocao for invalida, exibe `Quantidade removida maior que o total coletado!`
- apos salvar, limpa formulario e volta o foco para o input de produto

## Scanner no legado

O scanner existia via `ProductInput.tsx`.

Comportamento identificado:

- leitura por camera na propria coleta
- busca por:
  - codigo de barras exato
  - codigo interno exato
  - codigo pesado usando substring do barcode
- som de sucesso em leitura com produto encontrado
- som de erro em produto nao encontrado
- suporte a camera traseira/frontal e flash no componente antigo

Importante:

- a tela de consumo antiga nao usava `keepScanning` nem `autoSaveFunction`
- entao consumo tinha scanner, mas nao fluxo continuo como a ruptura nova

## Fluxo de transmissao legado

Na `transmissionScreen.tsx`:

- filtra `logconsumo` com `transmitido = 0`
- monta payload por item
- agrega por:
  - loja
  - produto
  - tipo de consumo
  - usuario
  - ip terminal
- faz `POST /transmit/lancamentoconsumo`
- se o backend responder com sucesso parcial, marca apenas parte dos itens como transmitidos

Ponto de atencao:

- a conciliacao do legado por `produto + tipo de consumo` e fragil quando existem multiplos lancamentos equivalentes
- isso nao deve ser portado literalmente para a arquitetura nova, que ja usa outbox por evento

## Dependencias tecnicas do legado

- `tipoconsumo` sincronizado em `app/config/sync.ts`
- loja atual vinda de `conprops.id_currentstore`
- produtos, embalagem e atributos auxiliares vindos de `produto` e `tipoembalagem`
- lista principal baseada em `logconsumo`

## Diferencas funcionais em relacao a troca

Consumo e troca sao muito parecidos, mas no legado o consumo:

- usa `tipoconsumo` em vez de `tipomotivotroca`
- grava em `logconsumo` em vez de `logtroca`
- transmite para `/transmit/lancamentoconsumo`
- nao depende do campo de produto `troca`
- nao tem semantica de “quantidade de troca”; e um lancamento de consumo com saldo positivo/negativo por motivo

Na pratica, o consumo antigo e estruturalmente um irmao da troca.

## Pontos de atencao para migrar ao app novo

- a UX pode seguir quase o mesmo modelo da troca nova
- o scanner pode reaproveitar a infraestrutura atual compartilhada, sem voltar ao componente legado
- a mascara decimal antiga de `NumberInput.tsx` nao deve ser portada; o app novo ja evoluiu para digitacao explicita
- a transmissao deve usar a outbox nova, nao o agrupamento fragil do legado
- sera necessario criar dominio proprio de `consumption reasons` no sync novo, porque hoje o app novo so tem catalogo de `exchange.reasons`

## Adaptacao implementada no app novo

O app novo passou a ter a rotina `Consumo` como feature propria, mas apoiada na mesma malha operacional da troca:

- tela principal com lista local de lancamentos
- modal inicial para selecionar `tipo de consumo`
- tela de coleta com produto, quantidade, embalagem, total e toggle `Adicionar / Remover`
- scanner por camera com lookup local
- transmissao manual e automatica pela outbox
- exclusao por swipe

Adaptacoes importantes em relacao ao legado:

- o catalogo de produtos continua compartilhado com troca e ruptura
- `tipoconsumo` ganhou dominio proprio de sync em `consumption.reasons`
- o envio nao agrupa mais registros para transmitir; cada lancamento vai como evento idempotente `consumption.item.recorded`
- a loja atual vem do sync global do app, nao de seletor local na feature

Pontos em que a nova base melhora o legado sem descaracterizar:

- persistencia offline-first com outbox por evento
- feedback visual e sonoro compartilhado
- scanner e lookup centralizados em componentes reutilizaveis
- componentes visuais de movimento extraidos para uso por troca e consumo
