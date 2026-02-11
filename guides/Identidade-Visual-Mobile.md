# Guia de Identidade Visual - Web para Mobile (PDT Connect)

## Objetivo
Este guia documenta a identidade visual atualmente aplicada no `apps/web` para servir como referencia na implementacao do app mobile (`apps/mobile`).

## Fontes revisadas
- `apps/web/src/index.css`
- `apps/web/src/hooks/useTheme.ts`
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/Sidebar/Sidebar.tsx`
- `apps/web/src/components/inputs/styles.ts`
- `apps/web/src/components/inputs/DefaultButton.tsx`
- `apps/web/src/components/table/TableCard.tsx`
- `apps/web/src/components/table/SimpleTable.tsx`
- `apps/web/src/components/modals/ConfirmModal.tsx`
- `apps/web/src/components/modals/NotificationDetailsModal.tsx`
- `apps/web/src/pages/LoginPage.tsx`

## 1) Paleta de cores

### 1.1 Tokens de marca (custom Tailwind)
Definidos em `apps/web/src/index.css`:

- `--color-pilar-green: #00553B`
- `--color-pilar-orange: #B54828`
- `--color-pilar-default-bg-dark: #282825`
- `--color-pilar-default-bg-light: #E3E3E3`
- `--color-pilar-default-bg2-dark: #33332F`

### 1.2 Cores complementares recorrentes
- Fundo dark do shell: `#1f1f1c`
- Gradiente dark da area de conteudo: `#22221f -> #1c1c19`
- Hover de botao primario (permissions toolbar): `#006b4a` e `#0b7a56`

### 1.3 Semantica de uso
- Primaria: `pilar-green`
- Acento/ativo: `pilar-orange`
- Superficies claras: `white`, `neutral-50`, `neutral-100`
- Superficies escuras: `pilar-default-bg-dark`, `pilar-default-bg2-dark`
- Sucesso: `emerald-*`
- Info: `sky-*`
- Alerta: `amber-*`
- Erro: `red-*`

## 2) Temas (light/dark)
- O app usa classe `dark` no `html` (`ThemeProviderWrapper` + `useTheme`).
- Tema salvo em `localStorage` na chave `theme`.
- Tema inicial padrao: `dark`.
- Varios componentes sao dual-theme com `dark:*`.

Observacao importante para o mobile:
- Para manter paridade visual, comecar com tema dark como default tambem no app mobile.

## 3) Tipografia
- Nao existe fonte custom carregada no web (sem `@font-face` e sem import externo em `index.html`).
- A tipografia segue o default sans do Tailwind (stack padrao do ambiente).
- Escala mais usada:
  - Titulos de pagina: `text-xl`, `text-2xl`
  - Titulos de secao/card: `text-base`, `text-lg`
  - Texto base: `text-sm`
  - Texto auxiliar/metadado: `text-xs`, `text-[11px]`, `text-[10px]`
- Pesos mais usados: `font-medium`, `font-semibold`, `font-bold`
- Uso pontual de mono para dados tecnicos: `font-mono`

## 4) Linguagem de superficies
- Cards: `rounded-xl`/`rounded-2xl`, borda `neutral-200` (light) e `neutral-700`/`white/10` (dark), `bg-white` (light) e `bg-neutral-900/*` ou `bg-pilar-default-bg-dark/*` (dark).
- Sidebar: gradiente vertical `from-pilar-green to-pilar-default-bg2-dark`.
- Topbar: efeito vidro (`bg-white/70` + `backdrop-blur-sm`) com variante dark translcida.
- Menus/dropdowns: blur, borda suave e sombra profunda custom.

## 5) Componentes base e comportamento

### 5.1 Botoes
- Primario: fundo `pilar-green`, texto branco.
- Secundario: fundo branco, texto `pilar-green`.
- Perigo: tons `red-*`.
- Acoes ativas no menu lateral: detalhe lateral em `pilar-orange`.
- Estados: hover, disabled e focus-ring sao consistentes em quase todos os botoes.

### 5.2 Campos de formulario
Base em `components/inputs/styles.ts`:
- Campo padrao: fundo branco (light) / fundo dark (dark), borda neutra, cantos arredondados.
- Foco: `focus:ring-pilar-green/35` + `focus:border-pilar-green`.
- Placeholder neutro.
- Componentes de select/multiselect reutilizam as mesmas classes base.

### 5.3 Tabelas
- Tabela dentro de card com borda e header contrastado.
- Header: `bg-neutral-100` (light) / `bg-neutral-800` ou `pilar-default-bg2-dark` (dark).
- Linhas com hover e estados de selecao com tint `pilar-green`.

### 5.4 Modais
- Backdrop escuro semitransparente (`bg-black/50` ou similar) + blur.
- Container arredondado com borda e sombra forte.
- Header com titulo semibold e botao de fechar discreto.

### 5.5 Feedback visual
- Badges/chips por semantica (neutral, success, info, warning, error).
- Toasts via `react-toastify`.
- Loader com overlay escuro.

## 6) Iconografia
- Biblioteca: `@mui/icons-material`.
- Tamanhos mais usados: `small` e `medium`.
- Icones com baixa saturacao em estado neutro e destaque de cor em estados ativos.

## 7) Espacamento, raio e profundidade
- Espacamentos recorrentes: `p-2`, `p-3`, `p-4`, `p-5`, `p-8`.
- Gaps comuns: `gap-2`, `gap-3`, `gap-4`.
- Raios recorrentes: `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`.
- Sombras: `shadow-sm`, `shadow-xl`, `shadow-2xl` e sombras custom em menus.

## 8) Movimento e interacao
- Transicoes curtas (`duration-150`, `200`, `300`) em hover/focus/abertura.
- Sidebar com animacao de largura e submenu com `framer-motion`.
- Em botoes, existe feedback de clique (`active:scale-95`) em alguns componentes.

## 9) Assets e branding
- Logo principal no login: `/logo.png`
- Marca secundaria home: `/pdt-logo-gray.png`
- Nome textual usado no shell: `PdT Connect`

## 10) Recomendacao de implementacao no mobile
Criar um arquivo central de tema (ex.: `apps/mobile/src/theme/tokens.ts`) com os mesmos tokens.

Sugestao minima:

```ts
export const colors = {
  pilarGreen: "#00553B",
  pilarOrange: "#B54828",
  bgDark: "#282825",
  bgDarkAlt: "#33332F",
  bgDarkShell: "#1f1f1c",
  bgLight: "#E3E3E3",
};
```

E manter as mesmas regras de semantica:
- primario = verde de marca
- destaque/ativo = laranja de marca
- sucesso/info/alerta/erro = emerald/sky/amber/red
- tema dark como padrao inicial

## 11) Checklist para paridade visual no app mobile
- Reproduzir paleta de marca exatamente pelos hex acima.
- Definir tema dark e light com as mesmas funcoes de cada cor.
- Reaplicar hierarquia tipografica (`xl/lg/base/sm/xs`).
- Padronizar componentes base: botao, input, card, modal, badge, tabela/lista.
- Garantir estados de interacao (hover/pressed/focus/disabled) equivalentes no mobile.
