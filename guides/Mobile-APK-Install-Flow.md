# Mobile APK Install Flow

## Como a APK e baixada

O fluxo de update do mobile baixa a APK em:

- [app-update-service.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/features/app-update/services/app-update-service.ts)

Passos:

1. usa `expo-file-system/legacy`
2. salva o arquivo em `FileSystem.cacheDirectory + updates/`
3. preserva extensao `.apk`
4. valida se o arquivo existe, nao e diretorio e tem tamanho maior que zero

## Como o URI e tratado

O arquivo baixado nasce como `file://`.

Antes de abrir o instalador, o fluxo converte esse caminho local para `content://` com:

- `FileSystem.getContentUriAsync(fileUri)`

Depois da conversao, o codigo valida explicitamente se o URI final comeca com `content://`.

## Como o instalador Android e aberto

O app abre o instalador com:

- `expo-intent-launcher`
- action `android.intent.action.INSTALL_PACKAGE`
- MIME type `application/vnd.android.package-archive`
- flag `FLAG_GRANT_READ_URI_PERMISSION`
- flag `FLAG_ACTIVITY_NEW_TASK`

Tambem foi adicionada a permissao Android:

- `android.permission.REQUEST_INSTALL_PACKAGES`

Configuracao:

- [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts)

## Qual era a causa do problema

O fluxo antigo desta implementacao ja fazia a conversao para `content://`, entao o problema nao era simplesmente usar `file://`.

A causa raiz era a combinacao de dois pontos:

1. a intent usada era generica, `android.intent.action.VIEW`
2. o app nao declarava `REQUEST_INSTALL_PACKAGES`

Na pratica, isso deixava o Android mostrar `Abrir com`, mas o Package Installer nao recebia o arquivo no fluxo mais apropriado para instalacao de APK.

## Como evitar o problema no futuro

1. Mantenha a APK sempre em arquivo local `.apk` valido.
2. Valide existencia e tamanho antes de tentar instalar.
3. Sempre converta `file://` para `content://` antes de entregar o arquivo a outro app.
4. Use intent de instalacao de pacote, nao fluxo generico de compartilhamento.
5. Mantenha `android.permission.REQUEST_INSTALL_PACKAGES` na build Android que faz sideload.
6. Valide o fluxo em build Android real, nao no Expo Go.
