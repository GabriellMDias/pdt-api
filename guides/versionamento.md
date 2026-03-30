# Guia de Versionamento

Este monorepo usa versionamento centralizado para `API`, `Web` e `Mobile`.

## Fonte oficial

A fonte oficial da versao funcional do produto fica em:

- [package.json](../package.json)

O mesmo arquivo tambem concentra o contador Android monotonicamente crescente:

```json
{
  "version": "2.2.2",
  "mobile": {
    "androidVersionCode": 10204
  }
}
```

## O que cada campo significa

- `version`: versao funcional usada por `API`, `Web` e `Mobile`, seguindo SemVer.
- `mobile.androidVersionCode`: inteiro crescente exigido pelo Android para upgrades reais de APK.

## Arquivos sincronizados

O script de sincronizacao atualiza:

- [package.json](../package.json)
- [apps/api/package.json](../apps/api/package.json)
- [apps/web/package.json](../apps/web/package.json)
- [apps/mobile/package.json](../apps/mobile/package.json)

No mobile, a configuracao nativa final vem de:

- [apps/mobile/app.config.ts](../apps/mobile/app.config.ts)

Ela injeta:

- `expo.version = package.json.version`
- `android.versionCode = package.json.mobile.androidVersionCode`
- `android.package = com.gabrielmdias.pdtmobile`

## Comandos disponiveis

Na raiz do monorepo:

```bash
npm run db:migrate:api
npm run version:sync
npm run version:set -- 2.2.3
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
npm run mobile:buildcode:bump
```

## O que cada comando faz

- `db:migrate:api`: aplica as migrations pendentes da API no banco atual.
- `version:sync`: copia a versao da raiz para API, Web e Mobile.
- `version:set -- X.Y.Z`: define uma versao especifica e sincroniza os `package.json`.
- `version:bump -- patch|minor|major`: incrementa a versao SemVer da raiz e sincroniza API, Web e Mobile.
- `mobile:buildcode:bump`: incrementa em `+1` o `mobile.androidVersionCode` na raiz.

## Regras praticas de evolucao

- `API`: acompanha `package.json.version`.
- `Web`: acompanha `package.json.version` e expoe a versao via `VITE_APP_VERSION`.
- `Mobile`: usa `version` como `versionName` e `mobile.androidVersionCode` como `buildNumber`.

Suba o `mobile.androidVersionCode` sempre que uma nova APK Android for distribuida.

## Quando gerar nova APK

Gere uma nova APK sempre que houver:

- correcao ou feature mobile que precise chegar ao aparelho
- alteracao nativa ou configuracional do app mobile
- nova distribuicao Android fora da Play Store

## Fluxo recomendado para release com mobile

### Quando a release muda a versao funcional

1. Atualize a versao SemVer.
2. Incremente o build Android.
3. Rode as validacoes necessarias.
4. Se houver mudanca de schema no backend, aplique as migrations da API.

Comandos:

```bash
npm run version:bump -- patch
npm run mobile:buildcode:bump
npm run db:migrate:api
```

### Quando a release muda so a APK Android

1. Mantenha `version` se fizer sentido.
2. Incremente o build Android.
3. Gere e publique a nova APK.
4. Se houver mudanca de schema no backend, aplique as migrations antes de operar a release.

Comando minimo:

```bash
npm run mobile:buildcode:bump
```

## Changelog e publicacao

Cada APK publicada deve registrar changelog na tela administrativa do web:

- [apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx](../apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx)

O changelog fica salvo no backend junto da release e e exibido no fluxo de update do mobile.

## Build Android

O fluxo principal esta pronto para EAS APK:

- [apps/mobile/eas.json](../apps/mobile/eas.json)
- [apps/mobile/package.json](../apps/mobile/package.json)

Comando:

```bash
cd apps/mobile
npm run build:android:apk
```

## Continuidade com o app antigo

Para atualizar por cima do app legado ja instalado no aparelho, o app novo precisa manter:

- `android.package = com.gabrielmdias.pdtmobile`
- a mesma assinatura Android da release antiga

Sem isso, o Android nao reconhece a APK nova como upgrade do app anterior.
