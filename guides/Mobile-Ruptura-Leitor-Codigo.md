# Mobile Ruptura Leitor Codigo

## Fluxo antigo
- O fluxo antigo acontecia dentro do componente [ProductInput.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile_old/mobile_front/components/ProductInput.tsx), usado pela tela de coleta [[prateleira].tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile_old/mobile_front/app/administrativo/ruptura/[prateleira].tsx).
- Ao tocar no icone de camera, o proprio `ProductInput` pedia permissao, abria `CameraView` em tela cheia e escutava `onBarcodeScanned`.
- Quando um codigo era lido, o componente fechava a camera, preenchia o campo e tentava resolver o produto localmente em tres passos:
  1. `codigobarras` exato
  2. `id` interno exato
  3. fallback de codigo pesado usando `substring(1, 7)` como `id` interno
- Se encontrasse produto, ele era selecionado automaticamente e o fluxo seguia para salvar a coleta.
- Se nao encontrasse, o legado exibia erro amigavel e mantinha o operador no fluxo da ruptura.

## Etapa da ruptura em que isso acontecia
- A leitura acontecia na segunda etapa da ruptura:
  1. informar prateleira
  2. abrir tela de coleta do produto
  3. digitar ou ler o codigo
  4. selecionar produto automaticamente ou via sugestao
  5. salvar coleta

## Como o produto era resolvido no legado
- A base local era carregada integralmente no `ProductInput`.
- A leitura tentava casar primeiro por codigo de barras.
- Se falhasse, tentava por codigo interno digitado/lido.
- Para alguns codigos pesados, o legado extraia o `id` interno do codigo lido e usava isso para encontrar o produto.
- A resolucao era toda local, sem chamada de rede.

## Adaptacao para o app novo
- O app novo manteve a resolucao local, agora usando o catalogo `catalog_products` no SQLite.
- A tela correspondente e [rupture-collect-screen.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/rupture/components/rupture-collect-screen.tsx).
- O scanner foi separado em uma tela dedicada [rupture-scan.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app/rupture-scan.tsx) com componente [rupture-barcode-scanner-screen.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/rupture/components/rupture-barcode-scanner-screen.tsx).
- Essa separacao deixa apenas uma `CameraView` ativa por vez, o que e mais estavel no Android e segue a recomendacao atual do Expo Camera.
- O lookup local ficou encapsulado em [rupture-db.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/rupture/data/rupture-db.ts), com as mesmas regras centrais do legado:
  1. `barcode` exato
  2. `id` interno exato
  3. fallback de codigo pesado para `id` interno
- Ao encontrar exatamente um produto, o scanner retorna para a coleta e a tela seleciona o produto automaticamente.

## Decisao para multiplos resultados
- Se o codigo lido bater em mais de um produto local, o app novo nao seleciona nada automaticamente.
- Nessa situacao, o scanner mostra mensagem operacional e orienta o usuario a concluir pela busca manual.
- A decisao foi conservadora para evitar selecao incorreta em ambiente de loja.

## Limitacoes atuais e dependencias
- A implementacao usa `expo-camera`, adicionada ao mobile novo e configurada no `app.json`.
- Em Expo Go, a funcionalidade depende de permissao de camera concedida no aparelho.
- O app novo ainda nao reproduz os sons do legado no sucesso/erro de leitura.
- O app novo tambem nao reabre automaticamente a camera apos leitura valida, como alguns fluxos antigos faziam com `keepScanning`.
- O fallback de codigo pesado foi mantido apenas para identificar o produto; a ruptura continua salvando o produto selecionado, nao o codigo pesado bruto.
