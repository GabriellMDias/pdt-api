# Guia de Versionamento

Este projeto agora usa um versionamento centralizado e sincronizado entre monorepo e frontend.

## Objetivo

- Manter uma unica versao oficial do produto.
- Garantir que `package.json` da raiz, API e Web fiquem iguais.
- Exibir automaticamente a versao atual no menu lateral do frontend.

## Fonte oficial da versao

A versao oficial fica em:

- `package.json` (raiz do monorepo)

Os arquivos abaixo sao sincronizados automaticamente:

- `apps/api/package.json`
- `apps/web/package.json`

## Comandos disponiveis

No `package.json` raiz foram adicionados:

```bash
npm run version:sync
npm run version:set -- 1.2.3
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
```

### O que cada comando faz

- `version:sync`: copia a versao atual da raiz para API e Web.
- `version:set -- X.Y.Z`: define uma versao especifica e sincroniza todos os `package.json`.
- `version:bump -- patch|minor|major`: incrementa a versao da raiz e sincroniza todos os `package.json`.

## Fluxo recomendado para release

1. Atualize a versao:
```bash
npm run version:bump -- patch
```
ou
```bash
npm run version:set -- 1.4.0
```
2. Rode build/tests do projeto.
3. Commit das alteracoes de versao.
4. Gere tag/release no seu fluxo de Git.

## Exibicao da versao no frontend

- A Web injeta a versao da raiz via `apps/web/vite.config.ts` em `import.meta.env.VITE_APP_VERSION`.
- O menu lateral exibe essa versao em `apps/web/src/components/Sidebar/Sidebar.tsx`.

Com isso, toda nova release refletida no `package.json` passa a aparecer automaticamente no menu lateral apos novo build/deploy do frontend.
