# Mobile Update System Architecture

## Objetivo

Construir um sistema de distribuicao e atualizacao do app Android fora da Play Store, integrado ao monorepo atual:

- `apps/mobile` verifica se existe nova versao
- a APK mais recente pode ser baixada sem token
- `apps/web` oferece area administrativa para upload e historico
- `apps/api` concentra metadados, armazenamento e distribuicao
- o mobile entra no padrao de versionamento do monorepo

## Status da implementacao

Esta arquitetura deixou de ser apenas proposta e passou a ter implementacao real nestes pontos:

- API:
  - [mobile-updates.module.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates.module.ts)
  - [mobile-updates.service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates.service.ts)
  - [mobile-updates-public.controller.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates-public.controller.ts)
  - [mobile-updates-admin.controller.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/api/src/mobile-updates/mobile-updates-admin.controller.ts)
- Web:
  - [MobileReleasesPage.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx)
- Mobile:
  - [app-update-coordinator.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/components/app-update-coordinator.tsx)
  - [app-update-modal.tsx](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/components/app-update-modal.tsx)
  - [app-update-service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/services/app-update-service.ts)

## Estado atual do monorepo

### Mobile

- O app novo usa Expo Router e ainda nao possui `android/` versionado.
- A versao atualmente aparece em `apps/mobile/package.json` e `apps/mobile/app.json`.
- O app hoje consegue ler a versao pelo `Constants.expoConfig?.version`.
- O app ainda nao le `buildCode/versionCode`.
- `apps/mobile/app.json` ainda nao define `android.package`.

### API

- A API usa NestJS + Prisma.
- Ja existe uso do diretorio `uploads/` para outras funcoes.
- Ja existe padrao de upload multipart no backend, por exemplo em `analysis.controller.ts`.

### Web

- O web usa roteamento central em `protectedRoutes.tsx`.
- Ja existem paginas administrativas com upload/listagem e com CRUD mais estruturado.
- O web ja le a versao do monorepo via `vite.config.ts`.

### Versionamento

- O guia atual `guides/versionamento.md` centraliza a versao em `package.json` da raiz.
- Hoje o script `scripts/version-manager.mjs` sincroniza apenas:
  - raiz
  - `apps/api/package.json`
  - `apps/web/package.json`

## Decisoes arquiteturais propostas

## 1. Fonte de verdade da versao

### Proposta

Manter dois conceitos separados:

- `versionName` semantico do produto
- `androidVersionCode` monotonicamente crescente

### Fonte recomendada

- `package.json` da raiz continua como fonte oficial da versao semantica:
  - ex.: `1.3.0`
- adicionar no `package.json` da raiz um bloco especifico do mobile:

```json
{
  "version": "1.3.0",
  "mobile": {
    "androidVersionCode": 10300
  }
}
```

### Como isso se propaga

- `apps/api/package.json` e `apps/web/package.json` continuam recebendo a mesma `version`.
- `apps/mobile/package.json` tambem passa a receber a mesma `version`.
- `apps/mobile/app.json` ou `app.config.ts` passa a receber:
  - `expo.version = root.version`
  - `android.versionCode = root.mobile.androidVersionCode`

### Motivo

- SemVer atende API/Web/mobile como versao funcional visivel ao usuario.
- Android exige um inteiro crescente para upgrade real de APK.
- Isso evita comparar somente string semantica no mobile.

## 2. Package Android e continuidade com o app antigo

### Proposta

Definir explicitamente em `apps/mobile/app.json`:

```json
"android": {
  "package": "com.gabrielmdias.pdtmobile"
}
```

### Motivo

- O legado usava esse package.
- Se a intencao for atualizar aparelhos que hoje ja tem o app antigo, manter o mesmo package e a mesma assinatura e obrigatorio.

## 3. Como o mobile verifica atualizacao

### Quando verificar

Checagem em dois pontos:

1. ao abrir o app, apos a resolucao inicial de conectividade
2. opcionalmente, um botao manual em Configuracoes

### Onde encaixar no mobile atual

Pontos mais adequados no projeto novo:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/src/features/auth/store/use-auth-store.ts`

### Comportamento proposto

- A checagem nao deve bloquear o bootstrap por muito tempo.
- Usar timeout curto, por exemplo 3 a 5 segundos.
- Se falhar:
  - atualizacao opcional: seguir normalmente
  - atualizacao obrigatoria: mostrar estado bloqueante quando houver conectividade

## 4. Como o mobile compara versoes

### Regras

- Comparacao principal por `androidVersionCode`.
- `versionName` fica para exibicao.
- O endpoint de metadata deve retornar:
  - `versionName`
  - `versionCode`
  - `required`
  - `publishedAt`
  - `changelog`
  - `downloadUrl`
  - `sha256`
  - `fileSizeBytes`

### Leitura no app

Adicionar `expo-application` para ler:

- `Application.nativeApplicationVersion`
- `Application.nativeBuildVersion`

Observacao:
- `Constants.expoConfig?.version` sozinho nao resolve comparacao robusta de APK.

## 5. Como o mobile baixa e instala a APK

### Fluxo proposto

1. app consulta metadata publica
2. se houver nova versao, mostra modal:
  - versao atual
  - versao nova
  - notas/changelog
  - se obrigatoria ou opcional
3. usuario toca em atualizar
4. app faz download da APK
5. ao concluir, app dispara o fluxo de instalacao Android
6. se o Android exigir permissao de fontes desconhecidas por origem, o sistema conduz o usuario

### Implementacao tecnica recomendada

Componentes necessarios no mobile:

- `expo-file-system` para download
- `expo-application` para versao/build atual
- `expo-intent-launcher` ou mecanismo equivalente para abrir o instalador Android
- ajuste nativo para `FileProvider`

### Ajustes nativos esperados

Como o app novo ainda nao versiona `android/`, a forma mais limpa e:

- usar `expo prebuild`
- adicionar um config plugin proprio para:
  - declarar `FileProvider`
  - declarar o authority correto
  - adicionar os caminhos compartilhados
  - adicionar o que for necessario para instalacao por APK

### Fallback recomendado

Manter tambem um fallback via navegador:

- se a instalacao in-app falhar
- ou se o aparelho/builder tiver restricao de intent

Nesse caso o app abre o `downloadUrl` publico no browser.

## 6. Atualizacao obrigatoria vs opcional

### Proposta

Suportar os dois modos na modelagem:

- `required = false`
  - modal dispensavel
- `required = true`
  - bloqueia o uso normal do app ate atualizar ou ate o usuario ficar offline sem rota segura

### Regra conservadora

Na primeira versao do sistema, mesmo com suporte a obrigatorio, usar opcional como padrao.

## 7. Endpoints propostos na API

## Publicos

### Metadata da ultima versao Android

```http
GET /api/mobile-updates/android/latest
```

Resposta sugerida:

```json
{
  "platform": "android",
  "versionName": "1.3.0",
  "versionCode": 10300,
  "required": false,
  "publishedAt": "2026-03-23T12:00:00.000Z",
  "changelog": "Correcoes de sincronizacao e novos fluxos operacionais.",
  "downloadUrl": "https://.../api/mobile-updates/android/latest/download",
  "sha256": "abc123...",
  "fileSizeBytes": 73400320
}
```

### Download da ultima APK sem token

```http
GET /api/mobile-updates/android/latest/download
```

## Autenticados/admin

### Listar releases

```http
GET /api/mobile-updates/android/releases
```

### Upload de nova release

```http
POST /api/mobile-updates/android/releases
Content-Type: multipart/form-data
```

Campos sugeridos:

- `file`
- `versionName`
- `versionCode`
- `changelog`
- `required`
- `publishNow`

### Consultar release especifica

```http
GET /api/mobile-updates/android/releases/:id
```

### Publicar/despublicar

```http
PATCH /api/mobile-updates/android/releases/:id
```

### Download de versao especifica

```http
GET /api/mobile-updates/android/releases/:id/download
```

Esse download pode ser:

- autenticado no admin
- ou publico, se voces quiserem manter historico aberto

Recomendacao inicial:
- ultima versao publica
- historico autenticado

## 8. Modelagem proposta no backend

### Entidade principal

```text
MobileAppRelease
```

Campos sugeridos:

- `id`
- `platform` (`ANDROID`)
- `channel` (`production`, `internal`, `qa`) opcional
- `versionName`
- `versionCode`
- `required`
- `published`
- `publishedAt`
- `changelog`
- `fileNameStored`
- `fileNameOriginal`
- `mimeType`
- `fileSizeBytes`
- `sha256`
- `storagePath`
- `createdAt`
- `createdByUserId`

Indices/regras:

- `UNIQUE(platform, versionCode)`
- `INDEX(platform, published, publishedAt DESC)`

### Armazenamento do arquivo

Recomendacao inicial, coerente com a API atual:

- armazenar em disco local, em algo como:

```text
uploads/mobile-updates/android/{id}/app-release.apk
```

Vantagens:

- encaixa no padrao ja existente de `uploads/`
- simples de operar agora

Risco:

- se a API rodar com multiplas instancias ou containers efemeros, sera preciso storage compartilhado

Mitigacao futura:

- abstrair storage para MinIO/S3/NAS depois

## 9. Estrutura proposta na API

```text
apps/api/src/mobile-updates/
  mobile-updates.module.ts
  mobile-updates.controller.ts
  mobile-updates-admin.controller.ts
  mobile-updates.service.ts
  mobile-updates.storage.ts
  dto/
  entities/
```

Separacao sugerida:

- controller publico: metadata + latest download
- controller admin: upload/listagem/publicacao/download historico

## 10. Estrutura proposta no web

### Local da funcionalidade

Sugestao principal:

- nova tela em `Configuracoes`
- rota: `/configuracoes/mobile/releases`
- label no sidebar: `Versoes Mobile`

### O que a tela deve ter

- upload de nova APK
- lista de releases anteriores
- filtros por canal/status
- botao de publicar/despublicar
- botao de download
- exibir:
  - `versionName`
  - `versionCode`
  - data
  - changelog
  - tamanho
  - hash
  - status publicada
  - obrigatoria/opcional

### Permissoes sugeridas

- `mobile-releases:consultar`
- `mobile-releases:publicar`
- `mobile-releases:baixar`

## 11. Estrutura proposta no mobile

```text
apps/mobile/src/features/app-update/
  api/
  components/
  hooks/
  services/
  types.ts
```

Componentes sugeridos:

- `app-update-service.ts`
- `use-app-update-check.ts`
- `app-update-modal.tsx`
- `app-update-download-screen.tsx` opcional

## 12. Fluxo completo do build ate a distribuicao

## Build

### Fluxo recomendado

Como o app novo nao possui `android/` versionado, o fluxo principal recomendado e EAS Build:

1. ajustar versao semantica na raiz
2. incrementar `androidVersionCode`
3. sincronizar versoes para o mobile
4. gerar APK assinada

Exemplo de perfil futuro:

```json
{
  "build": {
    "android-apk": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Comando esperado:

```bash
npx eas build -p android --profile android-apk
```

### Fallback local

Fluxo local alternativo:

```bash
cd apps/mobile
npx expo prebuild -p android
cd android
./gradlew assembleRelease
```

## Publicacao

1. admin acessa a tela web
2. envia a APK + metadados
3. backend salva arquivo e registro
4. admin publica release
5. endpoint publico de metadata passa a apontar para essa release

## Consumo pelo mobile

1. app abre
2. checa metadata publica
3. compara `versionCode`
4. se houver nova versao, mostra modal
5. usuario baixa
6. app abre instalador Android

## 13. Riscos tecnicos e mitigacao

### 1. Upgrade por cima do app antigo

Risco:
- se o package ou a assinatura mudarem, nao havera upgrade in-place

Mitigacao:
- manter `com.gabrielmdias.pdtmobile`
- preservar a mesma keystore

### 2. Expo Go nao serve para validar o fluxo

Risco:
- instalacao de APK exige build Android real, nao Expo Go

Mitigacao:
- validar apenas em release build/dev client nativo

### 3. Instalacao via APK exige camada nativa

Risco:
- download em JS nao basta para instalar

Mitigacao:
- config plugin + FileProvider + intent Android
- fallback via browser

### 4. Public latest sem token

Risco:
- URL pode ser compartilhada livremente

Mitigacao:
- limitar o publico ao `latest`
- historico autenticado
- registrar hash e tamanho
- preferir HTTPS

### 5. Storage local em disco

Risco:
- multiplas instancias podem perder consistencia

Mitigacao:
- iniciar com disco local
- migrar para storage compartilhado se a operacao exigir

## 14. Recomendacao de implementacao por fases

### Fase 1

- definir versionamento mobile no monorepo
- definir package Android estavel
- criar modelagem + endpoints na API
- criar tela admin no web
- disponibilizar download publico da ultima APK

### Fase 2

- adicionar checagem de metadata no mobile
- mostrar modal de update
- abrir download no navegador como fallback minimo

### Fase 3

- concluir download e instalacao in-app com suporte nativo
- suportar atualizacao obrigatoria

## Resumo executivo

A solucao mais coerente com o monorepo atual e:

- versao semantica centralizada na raiz
- `androidVersionCode` centralizado junto dessa governanca
- APK armazenada e distribuida pela API
- pagina admin no web para upload/listagem/publicacao
- mobile consultando metadata publica no startup
- ultima APK baixavel sem token
- instalacao Android feita por fluxo nativo controlado, com fallback via navegador

Essa proposta preserva o comportamento operacional do legado, mas corrige os pontos fracos dele:

- elimina fontes divergentes de versao
- traz o backend de release para dentro do monorepo
- cria governanca de upload/publicacao
- prepara o app novo para update realista fora da Play Store
