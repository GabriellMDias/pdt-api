# Mobile Light Theme Fixes

## Causa raiz dos problemas no light

Os problemas de contraste no tema light nao estavam no `ThemeProvider` em si. A causa principal era combinacao de:

- telas ainda importando `colors` estatico de `@/src/theme/tokens`, que continua apontando para a paleta dark por compatibilidade
- estilos locais com cores hardcoded em cards, labels, bordas, placeholders e blocos de destaque
- alguns componentes operacionais ainda renderizando superficies escuras fixas nas listas de ruptura e troca
- a acao secundaria `Cancelar` do modal de motivo da troca sobrescrevendo a cor do label com um tom claro demais para o light

## Componentes e telas corrigidos

### Editar Favoritos

Arquivo:

- `apps/mobile/src/features/home/components/home-favorites-editor-screen.tsx`

Ajustes:

- remocao do uso de `tokens.colors` estatico
- chips, grupos, estados vazios e mensagens de erro agora usam o tema atual
- opcoes selecionadas ganharam contraste correto no light

### Modulos abertos pela Home

Arquivos:

- `apps/mobile/src/features/home/components/home-group-screen.tsx`
- `apps/mobile/src/features/home/components/home-menu-card.tsx`
- `apps/mobile/src/features/home/components/home-placeholder-screen.tsx`

Ajustes:

- superficies e textos agora seguem `useAppTheme`
- cards de menu nao ficam mais presos ao fundo dark
- placeholders dos modulos herdados da Home antiga respondem corretamente ao light

### Modal de motivo da troca

Arquivo:

- `apps/mobile/src/features/troca/components/troca-reason-modal.tsx`

Ajustes:

- o botao `Cancelar` deixou de sobrescrever o label com cor clara demais
- o modal continua usando o select compartilhado e agora fica legivel em light

### Coleta da troca

Arquivos:

- `apps/mobile/src/features/troca/components/troca-collect-screen.tsx`
- `apps/mobile/src/features/troca/components/troca-add-remove-toggle.tsx`
- `apps/mobile/src/features/troca/components/troca-list-item.tsx`
- `apps/mobile/src/features/troca/components/troca-screen.tsx`

Ajustes:

- campo de motivo, textos auxiliares, blocos de informacao e notice boxes passaram a consumir o tema atual
- os campos metricos deixaram de usar bordas e placeholders hardcoded do dark
- o bloco de produto selecionado deixou de forcar fundo escuro no light
- a lista principal e o estado de carregamento/transmissao da troca agora respeitam o tema

### Ruptura

Arquivos:

- `apps/mobile/src/features/rupture/components/rupture-collect-screen.tsx`
- `apps/mobile/src/features/rupture/components/rupture-list-item.tsx`
- `apps/mobile/src/features/rupture/components/rupture-screen.tsx`

Ajustes:

- toggle de coleta continua, checkbox, textos e modal de lookup agora usam as cores do tema atual
- cards da lista de transmissao deixaram de usar fundo dark fixo
- empty state e modal de transmissao passaram a respeitar o tema

## Como o contraste foi ajustado no light

As correcoes seguiram estas regras:

- texto principal sempre em `theme.colors.text.primary`
- texto secundario/helper em `theme.colors.text.secondary` ou `theme.colors.text.muted`
- placeholders em `theme.colors.text.placeholder`
- superficies em `theme.colors.background.surface`, `surfaceAlt` ou `surfaceMuted`
- bordas em `theme.colors.border.default` ou `border.strong`
- estados selecionados e destaques em tons brand com opacidade menor no light
- erros usando `theme.colors.badge.error.text` em vez de vermelho hardcoded

## O que ainda pode precisar de refinamento

- existem outras telas secundarias fora do escopo desta etapa que ainda podem ter hardcodes residuais
- partes antigas que ainda dependem do alias `colors` em `tokens.ts` continuam com risco de herdar a paleta dark se nao forem migradas para `useAppTheme`
- alguns detalhes finos de densidade visual no light ainda merecem revisao em aparelho real

## Regra para proximas telas

Para novas telas e componentes:

- nao importar `colors` de `@/src/theme/tokens` para definir cor final de UI
- usar `useAppTheme()` e `useThemedStyles()` para qualquer cor, superficie ou borda dependente de tema
- evitar hex e `rgba(...)` fixos, exceto quando realmente fizer sentido e com variacao explicita por tema
