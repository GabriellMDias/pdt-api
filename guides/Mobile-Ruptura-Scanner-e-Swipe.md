# Mobile Ruptura Scanner e Swipe

## Referencia de legado revisada

- Exclusao por gesto no legado:
  - `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
  - o item usava `Swipeable` com `renderLeftActions`
  - o gesto principal era deslizar para a direita para abrir a acao de exclusao
- Alternancia de camera no legado:
  - `apps/mobile_old/mobile_front/components/ProductInput.tsx`
  - o scanner permitia trocar entre `back` e `front` com botao `camera-reverse`

## Como funciona a exclusao por swipe no app novo

- A lista da ruptura agora usa swipe no proprio item.
- O caminho principal de exclusao deixou de ser o botao de lixeira visivel.
- Comportamento:
  1. o operador desliza o item para a direita
  2. a faixa vermelha de exclusao aparece por baixo do card
  3. ao abrir o swipe, o app fecha a linha e dispara a confirmacao de exclusao
  4. se confirmado, a coleta e removida localmente junto com o evento correspondente da outbox

## Comparacao com o legado

- Fiel ao legado:
  - gesto horizontal para a direita
  - acao visual vermelha de exclusao
  - exclusao acontecendo a partir do movimento, e nao por botao principal da linha
- Adaptado para a base nova:
  - a exclusao continua passando pela remocao segura de `rupture_entries` e `sync_outbox_events`
  - foi mantida confirmacao de exclusao para reduzir risco operacional

## Como funciona a alternancia de camera

- A tela de scanner continua abrindo por padrao com a camera traseira.
- O overlay agora tem botao explicito para alternar entre:
  - camera traseira
  - camera frontal
- A escolha vale durante a sessao atual do scanner.
- Ao trocar a camera:
  - o lock de leitura e resetado
  - a tela volta para estado pronto para nova leitura
  - se a camera frontal for ativada, a lanterna e desligada automaticamente

## Como o scanner continua funcionando

- O fluxo de lookup nao mudou:
  1. leu um codigo
  2. procurou o produto na base local da loja atual
  3. se encontrou match unico, seleciona o produto automaticamente
  4. volta para a coleta
- O bloqueio contra leitura duplicada continua ativo com:
  - `scanLockRef`
  - `canScan`
  - debounce temporal por timestamp

## Limitacoes conhecidas do scanner

- A camera frontal existe para apoio operacional, mas nao e a camera ideal para leitura de codigo de barras.
- A lanterna so fica disponivel na camera traseira.
- Em alguns aparelhos Android, a camera frontal pode ter foco menos preciso para barcode do que a traseira.

## Resumo da comparacao com o legado

- Swipe:
  - voltou ao modelo estrutural do legado
  - hoje com remocao segura sobre a arquitetura offline-first nova
- Scanner:
  - recuperou o botao de inverter camera do legado
  - manteve o fluxo novo de lookup local e retorno automatico para a coleta
