# Mobile Theme System

## Resumo
- O app agora possui infraestrutura global de tema com dois modos: `dark` e `light`.
- O tema padrao e `dark`.
- A preferencia e salva localmente por usuario em `user_preferences`.
- A troca de tema acontece imediatamente no app, sem reinicio.

## Auditoria Inicial

### O que ja era favoravel a tema
- A base ja tinha tokens centralizados em `apps/mobile/src/theme`.
- Os componentes principais do design system (`Button`, `Card`, `Input`, `Badge`, `Screen`) ja eram compartilhados.
- A preferencia global por usuario ja tinha infraestrutura pronta em `user_settings.service.ts` e `use-auth-store.ts`.

### O que estava acoplado ao dark
- `colors.ts` exportava uma paleta unica.
- Diversos componentes usavam `colors` diretamente em `StyleSheet.create(...)` no escopo do modulo.
- Home, Login, Configuracoes e partes de Ruptura/Troca tinham cores hardcoded ou dependiam de componentes fixos no dark.

## Estrutura Nova

### Paletas
- Arquivo: `apps/mobile/src/theme/colors.ts`
- Exporta:
  - `darkColors`
  - `lightColors`
  - `resolveThemeColors(mode)`
  - tipo `AppThemeMode`

### Provider e Hook
- Arquivo: `apps/mobile/src/theme/theme-provider.tsx`
- Exporta:
  - `AppThemeProvider`
  - `useAppTheme()`
  - `useThemedStyles()`

### Integracao Global
- Arquivo: `apps/mobile/app/_layout.tsx`
- O app inteiro agora e envolvido por `AppThemeProvider`.
- O `StatusBar` acompanha o tema atual.

## Persistencia da Preferencia

### Onde fica salva
- Tabela existente: `user_preferences`
- Chave nova: `app_theme`
- Valores aceitos:
  - `dark`
  - `light`

### Fluxo
- Arquivo: `apps/mobile/src/features/settings/services/user-settings.service.ts`
  - carrega `app_theme`
  - salva `app_theme`
- Arquivo: `apps/mobile/src/features/auth/store/use-auth-store.ts`
  - mantem `appTheme` no estado global
  - carrega a preferencia no bootstrap e no `prepareApp`
  - atualiza a UI imediatamente ao salvar

### Regra padrao
- Se nao houver preferencia salva, o app usa `dark`.
- Como a chave e por usuario, usuarios diferentes no mesmo aparelho podem ter temas diferentes.

## Como Configurar
- Tela: `apps/mobile/src/features/settings/components/settings-screen.tsx`
- A configuracao fica em um card proprio chamado `Tema`.
- O usuario escolhe entre:
  - `Dark`
  - `Light`

## Componentes e Telas Ja Adaptados

### Componentes-base
- `Screen`
- `Card`
- `Input`
- `Button`
- `Badge`
- `Select`

### Infra de layout e navegacao
- `_layout`
- `FeatureScreenLayout`
- `HomeHeader`

### Fluxos/telas com boa resposta atual ao tema
- Login
- Home principal
- Configuracoes
- Selecao de loja da sincronizacao
- Modal de prateleira da ruptura
- Modal de motivo da troca
- Lista principal da ruptura
- Lista principal da troca
- Lookup de produto compartilhado
- Componentes compartilhados de transmissao

## Pontos Ainda Pendentes
- Algumas telas internas ainda mantem trechos hardcoded no visual, especialmente:
  - partes da coleta da ruptura
  - partes da coleta da troca
  - algumas telas secundarias da Home, como placeholders e edicao de favoritos
  - scanner de produto
- Esses pontos nao bloqueiam o teste da infraestrutura, mas ainda precisam de refinamento para cobertura total.

## Como Novas Telas Devem Consumir o Tema
- Usar `useAppTheme()` para acessar `colors`, `mode` e `isDark`.
- Usar `useThemedStyles()` para montar estilos dependentes de tema.
- Continuar usando `spacing`, `layout`, `radii` e `typography` dos tokens estaticos.
- Evitar criar novas cores hardcoded em `StyleSheet.create(...)` no escopo do modulo.

## Observacoes
- A base foi montada para crescer sem refatorar tudo de novo depois.
- O objetivo desta etapa foi deixar a infraestrutura correta e testavel agora, mesmo com algumas telas ainda parcialmente presas ao dark antigo.
