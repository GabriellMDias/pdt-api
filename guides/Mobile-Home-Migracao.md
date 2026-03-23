# Mobile Home Migracao

## Objetivo
Documentar a Home antiga do mobile para orientar a migracao da Home do app novo sem reinventar a UX. O foco aqui e reproduzir a estrutura e o comportamento do legado na arquitetura nova, separando o que e experiencia de uso do que e acoplamento tecnico legado.

## Fontes analisadas
- `apps/mobile_old/mobile_front/app/home/index.tsx`
- `apps/mobile_old/mobile_front/app/index.tsx`
- `apps/mobile_old/mobile_front/app/_layout.tsx`
- `apps/mobile_old/mobile_front/app/screensmenu/[screenGroupId].tsx`
- `apps/mobile_old/mobile_front/app/favorites/index.tsx`
- `apps/mobile_old/mobile_front/components/Menu.tsx`
- `apps/mobile_old/mobile_front/components/ModalMessage.tsx`
- `apps/mobile_old/mobile_front/constants/ScreensConfig.tsx`
- `apps/mobile_old/mobile_front/utils/getConProps.ts`
- `apps/mobile_old/mobile_front/app/config/sync.ts`
- `apps/mobile/src/features/auth/components/home-screen.tsx`
- `apps/mobile/app/home.tsx`
- `apps/mobile/app/_layout.tsx`
- `guides/Identidade-Visual-Mobile.md`

Observacao:
- O arquivo legado encontrado esta em `apps/mobile_old/mobile_front/app/home/index.tsx`.
- O codigo legado tem alguns textos com problema de encoding, mas o significado funcional continua identificavel no contexto.

## 1. Estrutura visual da Home antiga

### Header
- A Home antiga usa o header nativo do `Stack`, configurado no layout legado.
- Cor de fundo do header: `#095E4A`.
- Titulo visual exibido no header: `PdT Mobile`.
- Botao de abrir menu lateral no canto esquerdo com icone `Entypo menu`.
- O shell global do app legado tambem define fundo escuro de conteudo: `#282825`.

### Conteudo principal
- Tela principal ocupa a area inteira.
- O centro da Home mostra a imagem `pdt-logo-gray.png`, funcionando como area neutra da tela.
- Acima do conteudo principal existe uma faixa horizontal fixa com fundo `#373737`.
- Essa faixa horizontal contem os atalhos favoritos em scroll horizontal.
- Cada favorito e um bloco com:
  - icone central dentro de um circulo de `80x80`
  - borda cinza `#888888`
  - texto branco em uppercase, pequeno, centralizado
- No final da lista existe um item de adicionar favorito com icone `plus`.

### Sidebar lateral
- A sidebar e um `Animated.View` deslizante vindo da esquerda.
- Largura da sidebar: `75%` da tela.
- Fundo da sidebar: `#EEEEEE`.
- Abertura: animacao de `left: -100%` para `0%` em `300ms`.
- Estrutura interna:
  - topo com atalho para configuracoes
  - bloco de metadados do dispositivo e sincronizacao
  - lista vertical de acoes operacionais

### Botao e menu inferior
- Existe um menu inferior fixo implementado no componente `Menu`.
- Esse menu ocupa `70%` da altura da tela quando aberto.
- O painel sobe de baixo para cima com animacao (`bottom: -65%` para `0%` em `300ms`).
- O gatilho visual e um botao circular verde com texto `MENU` e icone de seta.
- O painel interno lista os grupos principais de navegacao do app legado.

### Navegacao disponivel a partir da Home antiga

#### Pela faixa de favoritos
- Abre a rota configurada em `screensConfig` para cada favorito salvo localmente.
- O botao `plus` leva para `/favorites`.

#### Pela sidebar
- `/config`
- acao local `Sincronizar`
- `/cleardata`
- `/favorites`
- acao local `Marcar tudo como Nao Transmitido`

#### Pelo menu inferior
- `Menu Principal` leva para `/home`
- os demais grupos levam para `/screensmenu/:screenGroupId`

#### Pela tela de grupo (`/screensmenu/:screenGroupId`)
- Exibe grade de telas do grupo selecionado.
- Cada item abre diretamente a rota da feature definida em `screensConfig`.

## 2. Comportamentos da Home antiga

### Carregamento inicial
- A Home antiga mostra `ActivityIndicator` enquanto `favoriteScreens` esta `undefined`.
- O carregamento dos favoritos e feito por query local na tabela `favoritos`.
- Os dados de contexto do dispositivo e da sincronizacao sao lidos localmente por `getConProps()`, a partir da tabela `conprops`.

### Atualizacao ao focar a tela
- A tela usa `useFocusEffect` duas vezes:
  - para recarregar favoritos
  - para recarregar `conProps`
- Isso significa que a Home antiga se atualiza quando o usuario volta para ela.

### Como a sidebar abre e fecha
- O botao do header chama `toggleDrawer()`.
- Se `closeOnly = false`, a animacao alterna entre aberto e fechado.
- Se `closeOnly = true`, a sidebar sempre fecha.
- Tocar fora da sidebar, na area principal, chama `toggleDrawer(true)` via `TouchableWithoutFeedback`.

### Comportamento real dos atalhos enquanto a sidebar esta aberta
- O metodo `navigateTo(route)` nao navega se a sidebar estiver aberta.
- Nesse caso ele apenas fecha a sidebar.
- Na pratica, com a sidebar aberta, o primeiro toque fora serve para fechar o drawer; a navegacao so acontece quando a tela esta novamente livre.

### Como funciona a sincronizacao
- O botao `Sincronizar` da sidebar:
  - abre o `ModalMessage` com titulo `Sincronizando...`
  - chama `synchronize(ipInt, portInt, ipExt, portExt, idCurrentStore)`
  - fecha o modal ao final
  - recarrega os metadados de `conProps`
- O sync legado fala diretamente com o backend legado e atualiza diversas tabelas locais dentro de transacao:
  - `loja`
  - `tipoembalagem`
  - `produto`
  - `receita`
  - `tipomotivotroca`
  - `tipoconsumo`
  - `balanco`
- O sync legado tambem atualiza em `conprops`:
  - `id_currentstore`
  - `lastsync`

### Como funciona a acao "Marcar tudo como Nao Transmitido"
- A Home antiga executa diretamente:
  - `UPDATE logbalancoitem SET transmitido = 0`
- Essa acao e local e especifica do legado.
- Ela nao conversa com um mecanismo generico de outbox.

### Como funciona o menu inferior
- O botao `MENU` abre e fecha um painel vertical fixo na parte inferior.
- O item atualmente selecionado recebe destaque com `backgroundColor: rgba(255,255,255,0.2)`.
- Em `Home`, o `selectedScreenId` e `1`.
- Ao tocar em outro grupo:
  - se o grupo for `1`, vai para `/home`
  - se for outro grupo, vai para `/screensmenu/:id`

### Grupos e opcoes de navegacao do legado

| Grupo | Destino do menu inferior | Observacao |
|---|---|---|
| Menu Principal | `/home` | propria Home |
| Administrativo | `/screensmenu/2` | contem `Ruptura` como rota real |
| Estoque | `/screensmenu/3` | contem `Balanco`, `Consumo`, `Producao`, `Troca` como rotas reais |
| Financeiro | `/screensmenu/4` | telas apontam para `/developing` |
| Nota Fiscal | `/screensmenu/5` | telas apontam para `/developing` |
| Logistica | `/screensmenu/6` | telas apontam para `/developing` |
| Utilitario | `/screensmenu/7` | telas apontam para `/developing` |
| PDV | `/screensmenu/8` | telas apontam para `/developing` |

### Rotas funcionais reais presentes no legado
- `/administrativo/ruptura/transmissionScreen`
- `/estoque/balanco/transmissionScreen`
- `/estoque/consumo/transmissionScreen`
- `/estoque/producao/transmissionScreen`
- `/estoque/troca/transmissionScreen`

## 3. Diferencas entre Home antiga e Home atual

| Tema | Home antiga | Home atual |
|---|---|---|
| Papel da tela | hub principal de navegacao operacional | dashboard de estado/bootstrap |
| Header | header nativo verde com hamburguer | sem header visivel |
| Navegacao principal | drawer lateral + faixa de favoritos + menu inferior expansivel | botoes verticais simples |
| Conteudo central | logo cinza do produto | cards de usuario, bootstrap e acoes |
| Dados locais | query direta em `favoritos` e `conprops` dentro da tela | Zustand + bootstrap + repositories |
| Sync | acao principal da sidebar, modal bloqueante | sync de usuarios e bootstrap exibidos como estado do app |
| Contexto de loja/dispositivo | exibido na sidebar | parcialmente disponivel no store, nao mostrado como shell |
| Estrutura visual | dark shell minimalista com elementos flutuantes | layout de cards padronizados |
| Menu de grupos | existe e controla navegacao geral | inexistente |
| Favoritos | existe faixa horizontal editavel | inexistente |

Leitura pratica:
- A Home nova atual resolve estados tecnicos importantes, mas nao reproduz o shell operacional do legado.
- A Home antiga e menos "dashboard" e mais "portal de entrada" para rotinas da loja.

## 4. Plano de migracao da Home antiga para a arquitetura nova

### Fase 1. Preservar o gating tecnico atual
- Manter `AppBootstrapStateScreen` para os estados `loading` e `error`.
- Renderizar a Home estilo legado apenas quando `appReadinessStatus === ready`.

### Fase 2. Criar um shell visual proprio da Home
- Criar um componente de shell dedicado, separado da `HomeScreen` atual.
- Reproduzir:
  - top bar verde
  - drawer lateral
  - faixa horizontal de favoritos
  - logo central
  - menu inferior expansivel

### Fase 3. Migrar a navegacao do legado para uma configuracao nova tipada
- Criar uma configuracao nova inspirada em `screensConfig`, mas alinhada as rotas reais do app novo.
- Manter a hierarquia de grupos do legado.
- Itens sem implementacao devem continuar visiveis, mas com estado controlado no app novo:
  - desabilitado
  - `em breve`
  - ou rota placeholder nova explicita

### Fase 4. Migrar favoritos para persistencia local nova
- Criar persistencia local propria para favoritos da Home.
- Nao consultar SQLite diretamente da view.
- Encapsular via repository/use case/store da Home.

### Fase 5. Migrar drawer lateral para dados da arquitetura nova
- Metadados a exibir no drawer devem vir da base nova:
  - usuario atual
  - loja ativa ou lojas disponiveis
  - ultima sincronizacao
  - versao do app
  - status de rede/sessao
- O comportamento visual deve ser o do legado, mas a fonte dos dados deve ser a arquitetura nova.

### Fase 6. Redefinir as acoes do drawer sem carregar acoplamentos errados
- `Sincronizar` deve chamar o fluxo novo de bootstrap/sync, nao o `synchronize()` legado.
- `Editar Favoritos` continua existindo como configuracao da Home.
- `Limpar Dados` precisa ser reespecificado para a base nova.
- `Marcar tudo como Nao Transmitido` nao deve ser portado literalmente sem revisao, porque a arquitetura nova usa outbox e receipts.

### Fase 7. Recriar as telas auxiliares do shell
- Criar pagina de grupo equivalente a `/screensmenu/:screenGroupId`.
- Recriar edicao de favoritos.
- Garantir que `Ruptura` entre primeiro como primeiro atalho operacional real na Home nova.

## 5. Componentes que precisam existir no mobile novo

- `HomeLegacyShell`
- `HomeHeaderBar`
- `HomeDrawer`
- `HomeDrawerMetadata`
- `HomeDrawerActionList`
- `HomeFavoritesRail`
- `HomeFavoriteShortcut`
- `HomeCentralBrandPanel`
- `BottomMenuSheet`
- `BottomMenuHandle`
- `BottomMenuGroupItem`
- `HomeNavigationConfig`
- `ScreensMenuScreen` para grupos
- `HomeFavoritesEditorScreen`
- `SyncProgressModal`

## 6. Itens que podem ser reaproveitados do design system atual

- tokens de `colors`, `spacing`, `layout` e `typography`
- `Badge` para chips de status de sessao/rede/sync, se fizer sentido no drawer
- `Button` como base para algumas acoes, desde que o visual seja ajustado para ficar proximo do legado
- `Card` para modais ou secoes auxiliares, nao necessariamente para o corpo principal da Home
- `Screen` para telas secundarias, como favoritos e menus de grupo
- `AppBootstrapStateScreen` para os estados de preparacao e erro antes de entrar na Home

Observacao:
- O shell principal da Home provavelmente vai precisar de composicao customizada, e nao apenas de `Screen + Card + Button`.
- O visual legado depende de layout em camadas, posicionamento absoluto e animacoes de drawer/menu.

## 7. Riscos e dependencias

### Dependencias tecnicas
- O app novo ainda nao possui persistencia de favoritos da Home.
- O app novo ainda nao possui configuracao de navegacao equivalente ao `screensConfig` legado.
- O app novo ainda nao possui tela de grupo equivalente a `/screensmenu/:screenGroupId`.
- O asset `pdt-logo-gray.png` existe no legado, mas nao esta presente em `apps/mobile/assets/images`.
- O layout novo esconde headers globalmente em `app/_layout.tsx`; para paridade com o legado sera preciso:
  - habilitar header por rota
  - ou recriar um top bar custom equivalente

### Dependencias de dominio
- O conceito de `loja selecionada` ainda precisa ficar explicito na arquitetura nova da Home.
- O significado da acao `Marcar tudo como Nao Transmitido` precisa ser redesenhado para a outbox nova.
- `Sincronizar` na Home nova precisa refletir o contrato novo de pull/push, nao o sync direto do backend legado.

### Riscos de migracao
- Copiar a Home antiga literalmente recriaria acoplamentos ruins:
  - SQL direto na tela
  - sync disparado pela UI sem orquestracao de dominio
  - navegacao baseada em config solta sem checagem de disponibilidade real
- Ignorar demais o legado manteria a Home nova distante do uso operacional real.
- O ponto correto e portar a experiencia visual e o fluxo de entrada, mas encaixando-os sobre:
  - bootstrap novo
  - SQLite novo
  - outbox/sync novo
  - rotas reais do app novo

## Recomendacao para a proxima etapa
- Implementar a nova Home como migracao de shell, nao como simples refactor da `HomeScreen` atual.
- Manter a estrutura do legado como referencia principal:
  - header com hamburguer
  - drawer lateral
  - favoritos no topo
  - logo central
  - menu inferior por grupos
- Ligar primeiro apenas o que ja existe no app novo:
  - `Ruptura`
  - `Logout`
  - refresh de bootstrap
  - metadados de usuario/rede/sync
- Deixar itens ainda nao migrados visiveis, mas controlados como indisponiveis ou pendentes.
