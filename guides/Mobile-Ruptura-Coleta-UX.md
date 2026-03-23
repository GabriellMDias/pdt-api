# Mobile Ruptura Coleta UX

## Referencias revisadas

- Legado: `apps/mobile_old/mobile_front/app/administrativo/ruptura/[prateleira].tsx`
- Legado: `apps/mobile_old/mobile_front/components/ProductInput.tsx`
- Novo app: `apps/mobile/src/features/rupture/components/rupture-collect-screen.tsx`
- Novo app: `apps/mobile/src/features/rupture/components/product-lookup-input.tsx`
- Novo app: `apps/mobile/src/features/rupture/components/rupture-shelf-modal.tsx`
- Novo app: `apps/mobile/src/features/rupture/components/rupture-barcode-scanner-screen.tsx`

## Modal de prateleira

- O modal continua com o mesmo objetivo: informar a prateleira antes de iniciar a coleta.
- A UX foi refinada com melhor hierarquia visual:
  - subtitulo explicando a etapa
  - superficie coerente com o tema dark do app
  - campo mais claro
  - botoes com espacamento mais equilibrado
- Nao houve mudanca de regra nem de fluxo.

## Tela de coleta

- A tela foi reorganizada em blocos operacionais:
  - card superior com prateleira, loja atual e botao `Salvar`
  - card central de selecao de produto
  - card inferior com resumo do produto selecionado
  - faixa de aviso/retorno logo abaixo
- Isso aproxima a leitura visual do legado, mas com melhor separacao entre contexto, acao e resultado.

## Lista de sugestoes do input

- A lista nao abre mais sozinha ao entrar na tela.
- Ela so aparece depois da primeira interacao do operador com o campo.
- A lista continua abrindo durante a digitacao.
- O dropdown agora pode ser rolado normalmente.
- Tocar fora fecha a lista e encerra o foco do campo.
- A busca continua funcionando por:
  - descricao
  - codigo EAN
  - codigo interno

## Modo continuo por scanner

- Foi adicionado um checkbox na propria tela de coleta.
- Modos disponiveis:
  - manual: le/seleciona o produto e salva pelo botao
  - continuo: leitura valida via scanner salva automaticamente e reabre a camera
- Regras do modo continuo:
  - so reabre o scanner depois que o item foi salvo com sucesso
  - se houver erro de produto ou erro de salvamento, o scanner nao reabre sozinho
  - o operador recebe a mensagem de erro e decide o proximo passo
- A reabertura foi protegida por lock local para evitar multiplas aberturas indevidas.

## Feedback sonoro

- Sons reaproveitados do legado:
  - sucesso: `beep-scanner.mp3`
  - erro: `error-sound.mp3`
- O som de sucesso toca quando a coleta e salva localmente com sucesso.
- O som de erro toca quando:
  - o produto nao e encontrado
  - a leitura fica ambigua
  - ha falha para salvar a coleta
  - o scanner falha ao inicializar
- O fluxo evita duplicidade de som:
  - nao toca bip de sucesso apenas por selecionar produto
  - no modo continuo, o bip sai no salvamento bem-sucedido, nao na leitura isolada

## Comparacao com o legado

- O legado ja tinha a ideia de:
  - foco em operacao rapida
  - sugestoes de produto
  - scanner embutido
  - `keepScanning` para coleta sequencial
  - bip de sucesso e erro
- O novo app agora recupera esse comportamento, mas sobre:
  - SQLite novo
  - outbox idempotente
  - scanner em rota dedicada
  - contexto de loja global

## Limitacoes pendentes

- O modo continuo foi aplicado ao fluxo via scanner; a digitacao manual continua exigindo toque em `Salvar`.
- Os sons dependem do suporte de audio do ambiente Expo atual.
- Ainda vale validar em aparelho real o ritmo da reabertura automatica da camera para operacao intensa.
