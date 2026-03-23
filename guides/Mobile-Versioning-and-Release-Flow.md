# Mobile Versioning and Release Flow

Este guia descreve o fluxo completo de geracao, publicacao, distribuicao e atualizacao da APK Android do `apps/mobile`.

## 1. Onde a solucao ficou implementada

### API

- [mobile-updates.module.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates.module.ts)
- [mobile-updates.service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates.service.ts)
- [mobile-updates-public.controller.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates-public.controller.ts)
- [mobile-updates-admin.controller.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates-admin.controller.ts)
- [schema.prisma](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/prisma/schema.prisma)

### Web

- [MobileReleasesPage.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx)
- [api.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/src/pages/configuracoes/mobile-releases/api.ts)
- [protectedRoutes.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/src/routes/protectedRoutes.tsx)

### Mobile

- [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts)
- [app-update-api.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/services/app-update-api.ts)
- [app-update-service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/services/app-update-service.ts)
- [app-update-modal.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/components/app-update-modal.tsx)
- [app-update-coordinator.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/components/app-update-coordinator.tsx)

## 2. Como definir versao e build

A fonte oficial fica na raiz:

- [package.json](/c:/Users/Gabriel/Workspace/pdt-api/package.json)

Campos:

- `version`
  - vira o `versionName` do mobile
- `mobile.androidVersionCode`
  - vira o `buildNumber`/`android.versionCode`

Comandos:

```bash
npm run version:bump -- patch
npm run mobile:buildcode:bump
```

## 3. Como gerar a APK nova

### Fluxo principal

```bash
cd apps/mobile
npm run build:android:apk
```

Isso usa:

- [eas.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/eas.json)

Perfil:

- `android-apk`

### Antes de gerar

1. Confirme se `version` esta correta.
2. Confirme se `mobile.androidVersionCode` foi incrementado.
3. Rode lint/typecheck do mobile.

## 4. Como subir uma nova versao

### Antes de usar a tela administrativa

Se o backend acabou de receber essa feature ou um deploy novo, aplique as migrations da API:

```bash
npm run db:migrate:api
```

Ou, direto na API:

```bash
cd apps/api
npm run db:migrate:deploy
```

Sem isso, a tabela `MobileAppRelease` ainda nao existe no banco e a rota `/configuracoes/mobile/releases` vai falhar.

### Pela Web

Entre em:

- `/configuracoes/mobile/releases`

Formulario:

- arquivo APK
- versao
- build
- changelog
- flag de atualizacao obrigatoria
- flag para publicar e marcar como latest

## 5. Como a API salva a release

### Metadados

Os metadados ficam em:

- tabela `MobileAppRelease`

Campos principais:

- `platform`
- `versionName`
- `buildNumber`
- `storagePath`
- `downloadFilename`
- `originalFilename`
- `fileSizeBytes`
- `sha256`
- `changelog`
- `isPublished`
- `isLatest`
- `isRequired`
- `publishedAt`

### Arquivo fisico

As APKs ficam em disco sob:

- `uploads/mobile-updates/android/`

## 6. Como marcar a versao publicada

Voce pode:

- publicar a release no proprio upload
- ou publicar depois pela tela do Web
- ou marcar uma release especifica como `latest`

Regras:

- o endpoint publico usa a release Android publicada mais recente
- `isLatest` tem prioridade
- se nao houver `isLatest`, a API cai para a release publicada mais recente

## 7. Como a Web exibe a versao

A tela administrativa mostra:

- versao
- build
- status publicada/rascunho
- indicacao de latest
- flag obrigatoria
- data
- arquivo original
- tamanho
- hash SHA-256
- changelog

Tambem permite:

- baixar APKs anteriores
- publicar/despublicar
- promover uma release para `latest`

## 8. Como a API disponibiliza a APK

### Endpoint publico de metadata

```http
GET /api/mobile-updates/android/latest
```

Retorna:

- `versionName`
- `buildNumber`
- `required`
- `publishedAt`
- `changelog`
- `downloadUrl`
- `sha256`
- `fileSizeBytes`

### Endpoint publico da ultima APK

```http
GET /api/mobile-updates/android/latest/download
```

Esse endpoint nao exige token.

### Endpoints administrativos

```http
GET /api/mobile-updates/android/releases
POST /api/mobile-updates/android/releases
PATCH /api/mobile-updates/android/releases/:id
GET /api/mobile-updates/android/releases/:id/download
```

## 9. Como o mobile verifica atualizacao

Ao abrir o app, o mobile monta o coordenador global em:

- [app/_layout.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app/_layout.tsx)

Fluxo:

1. espera o bootstrap minimo do app terminar
2. verifica se esta em Android nativo suportado
3. consulta `/api/mobile-updates/android/latest`
4. le a versao instalada com `expo-application`
5. compara `buildNumber` instalado x remoto
6. se houver update, abre o modal de atualizacao

## 10. Como o mobile le a versao atual

Leitura principal:

- `Application.nativeApplicationVersion`
- `Application.nativeBuildVersion`

Fallback:

- `Constants.expoConfig?.version`
- `Constants.expoConfig?.android?.versionCode`
- `extra.APP_VERSION_NAME`
- `extra.APP_BUILD_NUMBER`

Tudo isso vem da configuracao gerada por:

- [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts)

## 11. Como o usuario baixa e instala

Quando existe uma release nova:

1. o modal informa a nova versao
2. o usuario toca em `Atualizar`
3. o app baixa a APK via `expo-file-system/legacy`
4. converte o arquivo local para `content://`
5. abre o instalador Android via `expo-intent-launcher`

Se houver falha:

- o modal mostra erro
- o usuario pode abrir novamente o instalador
- pode abrir a configuracao de fontes desconhecidas
- ou usar o link publico no navegador como fallback

## 12. Como baixar versoes antigas

Na tela administrativa do Web, cada release tem botao:

- `Baixar APK`

Esse download usa o endpoint autenticado por ID da release.

## 13. Cuidados operacionais

### Assinatura Android

Para upgrade por cima do app antigo, use a mesma keystore.

### Package Android

O package do app novo foi fixado como:

- `com.gabrielmdias.pdtmobile`

### Expo Go

O fluxo de instalacao da APK nao deve ser validado no Expo Go.
Use build Android real ou dev client nativo.

### Public latest

O link da ultima APK e publico por design.
Use HTTPS e trate esse link como compartilhavel.

### Storage local

Hoje o backend salva a APK em disco local.
Se a API passar a rodar com multiplas instancias efemeras, sera preciso migrar para storage compartilhado.
