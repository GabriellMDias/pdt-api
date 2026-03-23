# Mobile Update Legacy Audit

## Escopo auditado

- `apps/mobile_old/mobile_front/app/index.tsx`
- `apps/mobile_old/mobile_front/utils/Updater.ts`
- `apps/mobile_old/mobile_front/types/rn-update-apk.d.ts`
- `apps/mobile_old/mobile_front/package.json`
- `apps/mobile_old/mobile_front/app.json`
- `apps/mobile_old/mobile_front/eas.json`
- `apps/mobile_old/mobile_front/database/database-init.tsx`
- `apps/mobile_old/mobile_front/utils/getConProps.ts`
- `apps/mobile_old/mobile_front/app/home/index.tsx`

## Como o legado funcionava

### Quando a checagem acontecia

- A checagem de atualizacao era disparada ao abrir o app, em `app/index.tsx`.
- O fluxo fazia:
  1. inicializacao do banco local
  2. leitura de `conProps`
  3. chamada do `Updater(...)`
  4. espera de ate 3,5 segundos antes de seguir para `/config` ou `/home`

### Como a versao atual era tratada

- A versao do app aparecia em varios lugares:
  - `package.json`: `1.1.7`
  - `app.json`: `1.1.7`
  - `database/database-init.tsx`: constante `APP_VERSION = '1.1.9'`
- Durante o bootstrap do banco, o app gravava `APP_VERSION` em `conprops.app_version`.
- A Home exibia essa versao local em `app/home/index.tsx`.

Observacao importante:
- Havia divergencia entre `package.json`/`app.json` e `database-init.tsx`.
- Isso indica que o legado nao tinha uma unica fonte confiavel de versao.

### Como a API era consultada

- O legado usava a biblioteca `rn-update-apk`.
- A URL de verificacao era montada dinamicamente com `conProps.ipint` e `conProps.portint`:

```text
http://{ip}:{porta}/checkforupdate/getlatestversion/{ip}/{porta}
```

- O fetch dessa URL tinha timeout de 3 segundos com `AbortController`.

### Como a disponibilidade de atualizacao era detectada

- A comparacao era delegada a `rn-update-apk`.
- Quando a lib detectava atualizacao, ela chamava `needUpdateApp(...)`.
- O app mostrava um `Alert`:
  - titulo: `Atualizacao disponivel`
  - texto: `Uma nova versao do app esta disponivel. Deseja atualizar agora?`

### Como o download e a instalacao aconteciam

- O app chamava `update.checkUpdate()`.
- O download era feito pela propria `rn-update-apk`.
- O app recebia callbacks:
  - `downloadApkStart`
  - `downloadApkProgress`
  - `downloadApkEnd`
- O progresso era repassado para a UI via `AtualizacaoContext`.
- A instalacao tambem ficava a cargo da lib nativa.

### Ajustes nativos inferidos

- O `Updater.ts` passava explicitamente:

```text
fileProviderAuthority: com.gabrielmdias.pdtmobile
```

- O `app.json` antigo definia:

```text
android.package = com.gabrielmdias.pdtmobile
```

- A copia do legado presente no repositorio nao contem `android/app/src/main/...`.
- Portanto, os detalhes de `AndroidManifest.xml`, `FileProvider` e `provider_paths.xml` nao podem ser confirmados diretamente nesta copia.
- Ainda assim, a existencia de `fileProviderAuthority` e do package Android mostra que havia dependencia nativa real para abrir o APK baixado.

### Build/distribuicao no legado

- O legado tinha `eas.json`.
- Havia perfil para gerar APK diretamente:

```json
"preview": {
  "android": {
    "buildType": "apk"
  }
}
```

- Isso confirma que a distribuicao fora da Play Store fazia parte do fluxo esperado.

## O que nao foi possivel confirmar no legado

- O backend antigo que respondia `/checkforupdate/getlatestversion/...` nao esta neste monorepo.
- O payload exato retornado por esse endpoint nao esta documentado no repositorio.
- Os arquivos Android nativos finais tambem nao estao versionados nessa copia antiga.

## Conclusoes da auditoria

- O legado ja tinha uma experiencia operacional valida de update fora da Play Store.
- A checagem era feita no startup, com timeout curto e sem bloquear o app por muito tempo.
- O download/instalacao dependiam de uma biblioteca nativa (`rn-update-apk`), nao de uma solucao puramente JS.
- O legado nao tinha governanca forte de versionamento: a versao aparecia em mais de uma fonte e podia divergir.
- O package Android antigo era `com.gabrielmdias.pdtmobile`.

## Implicacao critica para o projeto novo

Se o app novo precisar atualizar por cima do app antigo instalado no aparelho, ele precisara manter:

- o mesmo `android.package` / `applicationId`
- a mesma chave de assinatura Android

Sem isso, o Android nao tratara o APK novo como atualizacao do app antigo.
