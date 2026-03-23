# Mobile Troca Migracao

## Escopo auditado

Arquivos principais do legado revisados:

- `apps/mobile_old/mobile_front/app/estoque/troca/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/app/estoque/troca/[idMotivoTroca].tsx`
- `apps/mobile_old/mobile_front/components/ProductInput.tsx`
- `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- `apps/mobile_old/mobile_front/components/NumberInput.tsx`
- `apps/mobile_old/mobile_front/components/AddRadio.tsx`
- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile_old/mobile_front/database/migrations/1.ts`
- `apps/mobile_old/mobile_front/constants/ScreensConfig.tsx`
- `apps/mobile_old/mobile_backend/src/transmit/index.ts`
- `apps/mobile_old/mobile_backend/src/database/queries/estoque/troca.ts`

Arquivos principais da ruptura nova usados na comparacao:

- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`
- `apps/mobile/src/features/rupture/components/rupture-collect-screen.tsx`
- `apps/mobile/src/features/rupture/components/product-lookup-input.tsx`
- `apps/mobile/src/features/rupture/components/rupture-barcode-scanner-screen.tsx`
- `apps/mobile/src/features/rupture/components/rupture-list-item.tsx`
- `apps/mobile/src/features/rupture/data/rupture-db.ts`
- `apps/mobile/src/database/repositories/rupture.repository.ts`
- `apps/mobile/src/features/sync/services/global-sync.service.ts`
- `apps/mobile/src/features/settings/services/user-settings.service.ts`

## Estrutura da rotina antiga de troca

### Tela 1: lista/transmissao

Arquivo: `apps/mobile_old/mobile_front/app/estoque/troca/transmissionScreen.tsx`

Responsabilidades:

- mostra ultima sincronizacao da loja atual
- mostra lista local de lancamentos em `logtroca`
- mostra status transmitido / nao transmitido
- permite excluir item com swipe via `TransmissionList`
- tem botao `Transmitir`
- tem FAB `+` para iniciar novo lancamento
- abre modal para selecionar `motivo de troca`
- navega para `"/estoque/troca/[idMotivoTroca]"` depois da selecao

Dados exibidos por linha:

- motivo da troca
- codigo interno
- descricao do produto
- codigo de barras
- quantidade coletada com sinal
- status de transmissao

### Tela 2: coleta/lancamento

Arquivo: `apps/mobile_old/mobile_front/app/estoque/troca/[idMotivoTroca].tsx`

Responsabilidades:

- selecionar produto por busca ou scanner
- informar `quantidade`
- informar `embalagem`
- calcular `total = quantidade * embalagem`
- escolher entre `Adicionar` e `Remover`
- salvar localmente em `logtroca`
- mostrar informacoes do produto selecionado

Blocos visuais da tela:

- botao `Salvar` no topo direito
- `ProductInput` com busca e scanner
- linha de campos `Quantidade`, `Embalagem`, `Total`
- linha de campos `Quantidade Caixa`, `Peso Caixa` desabilitados
- seletor `Adicionar / Remover`
- nome do produto destacado
- bloco inferior com informacoes auxiliares do produto

### Componentes herdados de fora da pasta

- `ProductInput.tsx`: busca, sugestoes, camera, leitura de codigo, bip de sucesso e som de erro
- `NumberInput.tsx`: mascara numerica inteira/decimal
- `AddRadio.tsx`: toggle `Adicionar / Remover`
- `TransmissionList.tsx`: lista swipeable com status visual forte
- `ModalMessage.tsx`: modal de selecao/transmissao

## Fluxo funcional completo do legado

1. O operador abre `Troca` pela Home antiga em `ScreensConfig.tsx`, rota `"/estoque/troca/transmissionScreen"`.
2. A lista principal carrega `logtroca` da loja atual de `conprops.id_currentstore`.
3. Ao tocar no FAB, o app abre um modal com `DropDownPicker` para escolher `motivo de troca`.
4. Ao confirmar, navega para `"/estoque/troca/[idMotivoTroca]"`.
5. Na coleta, o operador escolhe o produto por:
   - digitacao por descricao
   - digitacao por codigo de barras
   - digitacao por codigo interno
   - leitura por camera pelo `ProductInput`
6. Depois informa `quantidade` e `embalagem`.
7. O app calcula `totalQuantity = quantidade * embalagem`.
8. O operador escolhe `Adicionar` ou `Remover`.
9. Ao salvar, o app grava uma linha em `logtroca` com:
   - `id_loja`
   - `codigobarras`
   - `id_produto`
   - `id_tipoentradasaida` (`0` adicionar, `1` remover)
   - `id_motivotroca`
   - `quantidade`
   - `transmitido = 0`
10. Ao voltar para a lista, cada linha aparece com quantidade assinada:
   - positiva para `id_tipoentradasaida = 0`
   - negativa para `id_tipoentradasaida = 1`
11. Ao transmitir, o app:
   - filtra `transmitido = 0`
   - converte a lista em payload por item
   - agrega por `loja + produto + motivo + usuario + terminal`
   - soma as quantidades agregadas
   - envia para `POST /transmit/lancamentotroca`
12. O backend processa item a item e devolve apenas os itens aceitos.
13. O mobile marca como transmitidos apenas os IDs locais associados aos itens aceitos.

## Regras de negocio percebidas no legado

### Regras locais de coleta

- O `motivo de troca` e obrigatorio antes de entrar na coleta.
- A loja usada na troca e a `loja atual` salva em `conprops`.
- O operador pode aumentar ou reduzir a troca:
  - `Adicionar` gera quantidade positiva
  - `Remover` vira quantidade negativa no momento da transmissao
- Ao remover, o app nao deixa remover mais do que o total pendente local do mesmo produto no mesmo motivo:
  - validacao usa apenas itens `transmitido = 0`
  - a mensagem e `Quantidade removida maior que o total coletado!`

### Regras do scanner/busca

- `ProductInput` carrega a base completa de produtos localmente.
- Limita sugestoes a `15` itens.
- Resolve produto por:
  - codigo de barras exato
  - codigo interno exato
  - fallback para codigo pesado usando substring do barcode
- Quando `setQuantity` e passado, o scanner de codigo pesado pode preencher `quantidade` automaticamente com base em `precovenda`.
- Na troca antiga, o scanner serve para selecionar produto; ele nao auto-salva e nao reabre em loop continuo.

### Regras de transmissao

- O payload enviado ao backend usa quantidade ja assinada.
- O backend antigo trata quantidade negativa como retirada da troca.
- O backend tambem:
  - gera movimento de estoque tipo `18`
  - registra `logtransacao`
  - insere `logtroca`
  - atualiza `produtocomplemento.troca`
- Produto com cadastro inativo pode ser rejeitado pelo backend.

## Estados de transmissao e exclusao

Estados observados no legado:

- `transmitido = 0`: nao transmitido
- `transmitido = 1`: transmitido
- a `TransmissionList` suporta um visual de `parcial`, mas a rotina de troca nao grava esse estado localmente

Exclusao:

- feita por swipe para a direita na lista
- `TransmissionList` chama `onDelete(id)` assim que o swipe abre completamente
- a exclusao local e direta, sem confirmacao intermediaria

## Dependencias de sincronizacao no legado

Sync local necessario para a rotina funcionar:

- `tipomotivotroca`
- `produto`
- `tipoembalagem`
- `loja`

Campos do `produto` que a troca antiga realmente usa:

- `id`
- `codigobarras`
- `qtdembalagem`
- `decimal`
- `id_tipoembalagem`
- `descricaocompleta`
- `precovenda`
- `estoque`
- `customediocomimposto`

Campos sincronizados mas pouco ou nao usados diretamente pela tela:

- `troca`
- `pesobruto`
- `permitequebra`
- `permiteperda`
- `fabricacaopropria`

## Diferencas mais importantes em relacao a ruptura nova

O que e parecido:

- existe uma tela principal de transmissao/lista
- existe coleta offline com persistencia local
- existe exclusao por swipe
- existe produto por busca/scanner
- existe transmissao posterior
- existe audio operacional e feedback de erro/sucesso

O que muda de verdade:

- a troca exige `motivo`, `quantidade`, `embalagem` e `modo adicionar/remover`
- a ruptura usa `prateleira`, a troca nao
- a ruptura nova salva um item simples; a troca precisara salvar quantidade assinada e motivo
- a ruptura nova usa um catalogo de produto mais enxuto; a troca precisa de um catalogo mais rico
- a ruptura nova tem modo continuo do scanner; a troca antiga nao auto-salva porque depende da quantidade

## Pontos de atencao para migrar ao app novo

### 1. Nao reutilizar a coleta de ruptura como esta

A coleta da ruptura e centrada em:

- prateleira
- produto unico por evento
- scanner podendo auto-salvar

A troca precisa de:

- motivo de troca antes da coleta
- campos numericos adicionais
- regra de quantidade assinada
- validacao de remocao contra saldo pendente local

### 2. O catalogo atual da ruptura nao basta

O schema novo `catalog_products` hoje guarda:

- `id`
- `barcode`
- `description`
- `package_quantity`
- `packaging_type_id`
- `packaging_description`
- `shelf_code`

Para troca, isso e insuficiente. Faltam pelo menos:

- `decimal`
- `precovenda`
- `estoque`
- `customediocomimposto`

Sem isso, nao da para portar fielmente:

- mascara decimal da quantidade
- total de custo/preco mostrado na tela
- calculo de quantidade a partir de codigo pesado

### 3. A API nova ainda nao tem dominio de troca

Estado atual encontrado:

- existe `mobile-sync` para `rupture.products`
- existe processor `rupture.item.reported`
- nao existe contrato novo para:
  - `tipomotivotroca`
  - catalogo de produto da troca
  - evento de lancamento de troca

### 4. O legado agrega transmissao de forma arriscada

Na transmissao antiga:

- o mobile agrega por `produto + motivo + loja + usuario + terminal`
- a marcacao de sucesso local cruza principalmente `id_produto` e `id_motivotroca`

Isso pode mascarar falhas em cenarios com repeticoes do mesmo produto/motivo. O app novo nao deve copiar essa fragilidade.

### 5. Scanner da troca nao deve herdar o modo continuo da ruptura por padrao

Na troca antiga:

- o scanner seleciona o produto
- o operador ainda precisa revisar `quantidade`, `embalagem` e `Adicionar/Remover`

Entao o modo continuo da ruptura nao e um reaproveitamento natural para o primeiro corte da troca.

## Implementacao realizada no app novo

Arquivos principais implementados na base nova:

- `apps/mobile/app/troca.tsx`
- `apps/mobile/app/troca-collect.tsx`
- `apps/mobile/app/troca-scan.tsx`
- `apps/mobile/src/features/troca/components/troca-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-collect-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-reason-modal.tsx`
- `apps/mobile/src/features/troca/components/troca-add-remove-toggle.tsx`
- `apps/mobile/src/features/troca/components/troca-list-item.tsx`
- `apps/mobile/src/features/troca/components/troca-barcode-scanner-screen.tsx`
- `apps/mobile/src/features/troca/data/troca-db.ts`
- `apps/mobile/src/database/migrations/010-exchange-foundation.ts`

O que ficou fiel ao legado:

- tela principal com lista de lancamentos locais, status de transmissao, swipe para excluir, botao `Transmitir` e FAB `+`
- modal para selecionar `motivo de troca` antes da coleta
- tela de coleta com:
  - busca por descricao, EAN e codigo interno
  - scanner
  - campos `Quantidade`, `Embalagem` e `Total`
  - campos auxiliares de embalagem e peso
  - toggle `Adicionar / Remover`
  - card com informacoes operacionais do produto
- transmissao por lote de pendencias da loja atual

O que foi adaptado para a arquitetura nova:

- persistencia offline-first em `exchange_entries` + `sync_outbox_events`
- idempotencia no envio por `event_id`
- uso da loja atual global do app, em vez de seletor local na rotina
- uso do parametro global `autoTransmitEnabled`, em vez de configuracao local da troca
- lista/status guiados pela outbox nova, e nao apenas por um booleano `transmitido`

Limitacoes atuais desta implementacao:

- a API nova de troca cobre o fluxo principal, mas nao porta ainda todas as regras mais profundas do backend legado
- o scanner da troca seleciona produto, mas nao reintroduz auto-preenchimento de quantidade pelo barcode pesado como fluxo principal
- a transmissao nova envia evento por lancamento, e nao a agregacao fragil do legado
