# Mobile Login e Loading Refino

## Login

- A tela de login do mobile foi simplificada para ficar mais proxima da composicao da versao web em `/apps/web/src/pages/LoginPage.tsx`.
- A hierarquia visual agora ficou centrada em um unico card, com:
  - logo
  - nome do app
  - campo de login
  - campo de senha
  - botao `Entrar`
  - botao `Sincronizar`
  - informacao de ultima sincronizacao
- Foram removidos da tela principal:
  - badge de ambiente
  - texto descritivo longo
  - URL da API
  - mensagens inline de sucesso/offline
  - blocos extras de aviso no corpo da tela

## Logo

- O mobile passou a reutilizar a logo da versao web.
- O asset `apps/web/public/logo.png` foi copiado para `apps/mobile/assets/images/web-login-logo.png` para uso bundlado no React Native.

## Feedback

- Erros de login e de preparacao da sincronizacao inicial agora aparecem fora do layout principal, via alerta, para manter a tela limpa.
- O modal de selecao de loja continua sendo usado para a sincronizacao inicial.

## Loading Inicial

- O loading inicial foi simplificado para um componente unico com apenas animacao.
- Esse componente e usado tanto no bootstrap raiz do app quanto no preparo inicial da sessao autenticada.
- Os textos verbosos de carregamento deixaram de aparecer nesses estados iniciais.

## Limitacoes e ajustes futuros

- A tela foi aproximada da versao web sem reescrever o fluxo de autenticacao.
- O modal de sincronizacao inicial continua exibindo mensagens e etapas do processo, porque ele faz parte do fluxo operacional de sync, nao do loading inicial do app.
