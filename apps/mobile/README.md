# PDT Connect Mobile

Cliente mobile operacional do monorepo, construido em Expo SDK 54 para substituir o frontend legado que hoje vive em `apps/mobile_old/mobile_front`.

## Principios do projeto

- consumir exclusivamente a API principal em `apps/api`
- funcionar em modo `offline-first`
- usar SQLite local com SQL manual + migrator
- manter a outbox compartilhada para transmissao operacional
- preservar comportamento valido ja consolidado
- evitar mudancas invasivas no banco do VRMaster

## Estado atual

Hoje o app ja entrega:

- login online/offline e bootstrap local de sessao
- sincronizacao de conta, lojas e permissoes
- catalogos locais por loja e por dominio operacional
- modulos operacionais ativos para `ruptura`, `troca`, `consumo`, `producao` e `balanco`
- home nova, favoritos, configuracoes, update do app e utilitarios de suporte/dev

Outras entradas do menu seguem como placeholder e devem ser tratadas como backlog de produto, nao como documentacao separada em `guides/`.

## Estrutura principal

- `app/`: rotas do Expo Router
- `src/database/`: acesso ao SQLite, migracoes e repositories
- `src/features/bootstrap/`: conta, lojas e permissoes
- `src/features/sync/` e `src/features/mobile-sync/`: sync global, outbox e push de eventos
- `src/features/shared/`: componentes e servicos reutilizados entre rotinas
- `src/features/rupture/`, `src/features/troca/`, `src/features/consumo/`, `src/features/producao/`, `src/features/balanco/`: modulos operacionais
- `src/features/app-update/`: fluxo de atualizacao de APK
- `src/theme/`: tokens visuais compartilhados no app
- `src/services/`: cliente HTTP da API

## Documentacao oficial

- [Guia geral](../../guides/README.md)
- [Mobile: Arquitetura e Operacao](../../guides/Mobile-Arquitetura-e-Operacao.md)
- [Identidade Visual do Mobile](../../guides/Identidade-Visual-Mobile.md)
- [Versionamento](../../guides/versionamento.md)

## Fluxo de trabalho recomendado

1. Revisar o legado apenas como referencia funcional.
2. Preservar escrita local antes de transmissao.
3. Reutilizar blocos compartilhados antes de criar variantes por rotina.
4. Manter `apps/api` como unica integracao de backend.

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

Nao use `apps/mobile_old/mobile_backend`. A evolucao do app deve seguir a arquitetura atual documentada em `../../guides/Mobile-Arquitetura-e-Operacao.md`.
