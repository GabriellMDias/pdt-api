# Mobile Branding Assets

## Assets antigos reaproveitados

Os assets da identidade visual antiga passaram a ser a referencia principal no app novo:

- `apps/mobile_old/mobile_front/assets/images/icon.png`
- `apps/mobile_old/mobile_front/assets/images/adaptive-icon.png`
- `apps/mobile_old/mobile_front/assets/images/splash.png`
- `apps/mobile_old/mobile_front/assets/images/favicon.png`

O arquivo `pdt-logo-gray.png` ja era identico entre o app antigo e o app novo, entao foi mantido.

## Mapeamento no app novo

Os assets ativos do branding no app novo ficaram assim:

- App icon: `apps/mobile/assets/images/icon.png`
- Android adaptive icon: `apps/mobile/assets/images/adaptive-icon.png`
- Splash: `apps/mobile/assets/images/splash.png`
- Favicon/web: `apps/mobile/assets/images/favicon.png`
- Logo auxiliar ja existente e mantida: `apps/mobile/assets/images/pdt-logo-gray.png`

## Configuracao final

Em `apps/mobile/app.json`:

- `expo.icon` usa `./assets/images/icon.png`
- `expo.android.adaptiveIcon.foregroundImage` usa `./assets/images/adaptive-icon.png`
- `expo.android.adaptiveIcon.backgroundColor` usa `#ffffff`
- `expo.plugins[expo-splash-screen].image` usa `./assets/images/splash.png`
- `expo.plugins[expo-splash-screen].backgroundColor` usa `#ffffff`
- `expo.web.favicon` usa `./assets/images/favicon.png`

## Assets do template descartados da configuracao

Os seguintes assets genericos do template deixaram de participar da configuracao do app:

- `android-icon-background.png`
- `android-icon-foreground.png`
- `android-icon-monochrome.png`
- `splash-icon.png`
- `partial-react-logo.png`
- `react-logo.png`
- `react-logo@2x.png`
- `react-logo@3x.png`

## Limitacoes tecnicas

- O adaptive icon ficou configurado com `adaptive-icon.png` antigo como `foregroundImage` e fundo branco, seguindo a abordagem mais proxima da versao antiga e sem inventar novos assets.
- Mudancas em `icon`, `adaptive icon` e `splash` so aparecem de forma confiavel em uma nova build instalada. Hot reload nao atualiza esses recursos nativos do app ja instalado.
