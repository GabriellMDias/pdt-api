# PDT Connect Mobile

Aplicativo mobile novo do projeto, em Expo SDK 54, destinado a substituir o legado operacional que hoje vive em `apps/mobile_old/mobile_front`.

## Principios do projeto
- consumir exclusivamente a API principal em `apps/api`
- funcionar em modo `offline-first`
- usar SQLite local com SQL manual + migrator
- preservar o login novo ja implementado, salvo erro real
- manter paridade visual com `apps/web` seguindo `guides/Identidade-Visual-Mobile.md`
- evitar mudancas invasivas no banco do VRMaster

## Estado atual
O app novo ja entrega a fundacao de autenticacao:
- login online via API principal
- bootstrap de sessao local
- sincronizacao de usuarios para login offline
- armazenamento local de usuarios e sessao em SQLite
- tema inicial alinhado aos tokens visuais do projeto

Ainda nao foram migradas para o app novo as rotinas operacionais do legado:
- ruptura
- balanco
- consumo
- producao
- troca

## Estrutura principal
- `app/`: rotas do Expo Router
- `src/database/`: acesso ao SQLite e migracoes
- `src/features/auth/`: fluxo de login, sincronizacao de usuarios e sessao offline
- `src/theme/`: tokens visuais compartilhados no app
- `src/services/`: cliente HTTP da API

## Documentacao relacionada
- `guides/Identidade-Visual-Mobile.md`
- `guides/Migracao-Mobile-Incremental.md`

## Fluxo de trabalho recomendado
1. Revisar o legado antes de iniciar qualquer nova feature mobile.
2. Migrar por entregas pequenas, com checklist de aceitacao.
3. Priorizar fundacao offline, catalogos por loja e fila de transmissao antes de telas operacionais maiores.
4. Manter a API nova como unica integracao de backend.

## Execucao local
Instalar dependencias:

```bash
npm install
```

Subir o app:

```bash
npx expo start
```

## Observacao importante
Este app esta em migracao incremental. Evite rewrite desnecessario e prefira evoluir por extensao da base atual.
