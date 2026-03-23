# Mobile Ruptura Audio Feedback

## Fonte de verdade no legado

- Arquivos de audio reaproveitados do legado:
  - `apps/mobile_old/mobile_front/assets/audio/beep-scanner.mp3`
  - `apps/mobile_old/mobile_front/assets/audio/error-sound.mp3`
- Logica antiga encontrada em:
  - `apps/mobile_old/mobile_front/components/ProductInput.tsx`

## Como a versao antiga fazia

- O legado carregava os dois sons no `useEffect` com `Audio.Sound.createAsync(...)`.
- Mantinha uma instancia reutilizavel para o bip de sucesso e outra para o som de erro.
- No fluxo de leitura:
  - produto encontrado por codigo de barras: `bSound.replayAsync()`
  - produto nao encontrado: `eSound.replayAsync()`
- O padrao pratico era:
  - preload uma vez
  - reaproveitar a mesma instancia
  - tocar o som com `replayAsync()` exatamente no momento do resultado

## Adaptacao no app novo

- O app novo agora segue o mesmo modelo pratico do legado em `apps/mobile/src/features/shared/services/operational-feedback.service.ts`:
  - usa `expo-av`
  - cria uma instancia global de `Audio.Sound` para sucesso
  - cria uma instancia global de `Audio.Sound` para erro
  - faz preload via `warmupOperationalFeedbackAsync()`
  - toca com `replayAsync()` quando o fluxo confirma o resultado

## Quando toca som de sucesso

- Quando a coleta de ruptura e realmente salva com sucesso.
- Isso vale para:
  - salvamento manual
  - salvamento automatico no modo continuo do scanner

## Quando toca som de erro

- Quando o scanner le um codigo e nenhum produto local e encontrado.
- Quando o lookup do scanner retorna mais de um produto para o mesmo codigo.
- Quando ocorre falha real ao salvar a coleta.
- Quando ocorre falha real no lookup ou na inicializacao operacional do scanner.

## Quando nao toca som

- Duplicidade silenciosa do mesmo produto na mesma prateleira:
  - nao salva de novo
  - nao mostra erro
  - nao toca som de erro

## Observacoes de fluxo

- O som ficou ligado ao resultado final do fluxo, e nao ao simples toque no botao ou ao inicio da leitura.
- Isso evita tocar cedo demais, atrasado ou duplicado para a mesma leitura.
