# Guia de Versionamento

Este monorepo agora usa versionamento centralizado para `API`, `Web` e `Mobile`.

## Fonte oficial

A fonte oficial da versao funcional do produto fica em:

- [package.json](/c:/Users/Gabriel/Workspace/pdt-api/package.json)

O mobile tambem possui um contador Android monotonicamente crescente no mesmo arquivo:

```json
{
  "version": "1.2.0",
  "mobile": {
    "androidVersionCode": 10200
  }
}
```

## O que cada campo significa

- `version`
  - versao funcional exibida para usuarios e usada por `API`, `Web` e `Mobile`
  - segue SemVer, por exemplo `1.2.0`
- `mobile.androidVersionCode`
  - inteiro crescente exigido pelo Android para upgrades reais de APK
  - e o valor usado pelo app mobile para decidir se existe update disponivel

## Arquivos sincronizados

O script de sincronizacao atualiza:

- [package.json](/c:/Users/Gabriel/Workspace/pdt-api/package.json)
- [apps/api/package.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/package.json)
- [apps/web/package.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/package.json)
- [apps/mobile/package.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/package.json)

No mobile, a configuracao nativa final vem de:

- [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts)

Ela injeta:

- `expo.version = package.json.version`
- `android.versionCode = package.json.mobile.androidVersionCode`
- `android.package = com.gabrielmdias.pdtmobile`

## Comandos disponiveis

Na raiz do monorepo:

```bash
npm run db:migrate:api
npm run version:sync
npm run version:set -- 1.2.3
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
npm run mobile:buildcode:bump
```

### O que cada comando faz

- `db:migrate:api`
  - aplica as migrations pendentes da API no banco atual
- `version:sync`
  - copia a versao da raiz para API, Web e Mobile
- `version:set -- X.Y.Z`
  - define uma versao especifica e sincroniza os `package.json`
- `version:bump -- patch|minor|major`
  - incrementa a versao SemVer da raiz e sincroniza API, Web e Mobile
- `mobile:buildcode:bump`
  - incrementa em `+1` o `mobile.androidVersionCode` na raiz

## Regras praticas de evolucao

### API

- acompanha `package.json.version`
- nova release funcional da API costuma pedir novo `version`

### Web

- acompanha `package.json.version`
- a versao aparece automaticamente no menu lateral via `VITE_APP_VERSION`

### Mobile

- `versionName`
  - acompanha `package.json.version`
- `buildNumber`
  - acompanha `package.json.mobile.androidVersionCode`
  - precisa subir toda vez que uma nova APK Android for publicada

## Quando gerar nova APK

Gere uma nova APK sempre que houver:

- correcao ou feature mobile que precise chegar ao aparelho
- alteracao nativa/configuracional do app mobile
- nova release Android a ser distribuida fora da Play Store

## Fluxo recomendado para release com Mobile

### Quando a release muda a versao funcional

1. Atualize a versao SemVer:

```bash
npm run version:bump -- patch
```

2. Incremente o build Android:

```bash
npm run mobile:buildcode:bump
```

3. Rode as validacoes necessarias.
4. Se o backend recebeu mudancas de schema, aplique as migrations:

```bash
npm run db:migrate:api
```

### Quando a release muda so a APK Android

1. Mantenha `version` se fizer sentido.
2. Incremente o build Android:

```bash
npm run mobile:buildcode:bump
```

3. Gere e publique a nova APK.
4. Se houver alteracao de schema no backend, aplique as migrations antes de usar a tela de versoes mobile.

## Changelog

Cada APK publicada deve registrar changelog na tela administrativa do Web:

- [MobileReleasesPage.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx)

O changelog fica salvo no backend junto da release e e exibido no modal de update do mobile.

## Build Android

O fluxo principal esta pronto para EAS APK:

- [eas.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/eas.json)
- [apps/mobile/package.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/package.json)

Comando:

```bash
cd apps/mobile
npm run build:android:apk
```

## Observacao critica sobre continuidade com o app antigo

Para atualizar por cima do app legado instalado no aparelho, o app novo precisa manter:

- `android.package = com.gabrielmdias.pdtmobile`
- a mesma assinatura Android da release antiga

Sem isso, o Android nao reconhece a APK nova como upgrade do app anterior.
