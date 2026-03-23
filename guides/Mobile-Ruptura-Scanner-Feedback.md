# Mobile Ruptura Scanner Feedback

## Referencia do legado

- Na coleta antiga de ruptura, o app gravava em `logruptura` com `INSERT OR IGNORE` no arquivo `apps/mobile_old/mobile_front/app/administrativo/ruptura/[prateleira].tsx`.
- Isso fazia a duplicidade local da mesma `prateleira + produto` ser ignorada sem erro para o operador.
- No `ProductInput.tsx` legado, a camera era fechada assim que um codigo era lido. Quando o produto nao existia, o fluxo abria um modal de erro e nao deixava a camera ativa por tras.

## Duplicidade na mesma prateleira

- O app novo trata `mesmo produto + mesma prateleira + ainda pendente` como `duplicidade silenciosa`.
- Nesse caso:
  - nao grava um novo `rupture_entry`
  - nao cria novo evento na outbox
  - nao mostra erro visual
  - nao toca som de erro
- Em coleta continua por scanner:
  - a duplicidade silenciosa nao interrompe a operacao
  - o leitor e reaberto para a proxima leitura

## Codigo nao cadastrado

- Quando o scanner le um codigo que nao resolve nenhum produto local:
  - o app toca som de erro
  - fecha a rota da camera
  - volta para a tela de coleta
  - abre um modal com a mensagem `Produto nao encontrado para o codigo informado.`
  - mostra o codigo lido no corpo do modal
- Ao tocar em `OK`:
  - o modal fecha
  - o fluxo volta ao estado normal da coleta
  - o foco retorna para o input de produto

## Sons operacionais

- Som de sucesso:
  - toca quando a coleta e realmente salva com sucesso
  - vale para fluxo manual e para auto-save da coleta continua
- Som de erro:
  - toca quando o scanner nao encontra produto para o codigo lido
  - toca quando ha erro real de leitura/lookup
  - toca quando a coleta falha de verdade ao salvar
- Nao toca som:
  - na duplicidade silenciosa da mesma prateleira

## Erro real vs duplicidade silenciosa

- Erro real:
  - codigo nao cadastrado
  - falha de lookup
  - falha ao salvar a coleta
  - ambiguidade de lookup por mais de um produto
- Duplicidade silenciosa:
  - produto ja pendente para a mesma prateleira na base local
  - e tratada como `no-op` operacional, seguindo a leitura do legado

## Limitacoes pendentes

- A validacao final da experiencia de audio e camera ainda depende de teste em aparelho Android real.
- O caso de multiplos produtos para o mesmo codigo continua sendo tratado como erro operacional com retorno manual pelo operador.
