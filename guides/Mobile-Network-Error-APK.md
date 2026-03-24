# Mobile Network Error APK

## Problema encontrado

Na APK instalada, o login falhava com `Network error`, enquanto no desenvolvimento local o login funcionava.

## Causa real

A causa principal nao era falta de `usesCleartextTraffic` no app novo.

O problema real era a configuracao de ambiente da build Android:

- o perfil [eas.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/eas.json) chamado `android-apk` nao marcava `APP_ENV=production`
- em [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts), a ausencia desse sinal fazia o app cair em `development`
- com isso, a APK embutia `API_URL = http://192.168.110.30:4495/api`

Essa URL de desenvolvimento e invalida para a APK instalada em aparelho fora da rede/local de desenvolvimento e ainda usa HTTP.

## usesCleartextTraffic era necessario?

Para o fluxo correto de producao, nao.

A URL de producao configurada no projeto e:

- `https://connect.pilardaterra.com.br/api`

Como ela usa HTTPS, `usesCleartextTraffic` nao e necessario para o login da APK de producao.

`usesCleartextTraffic` so faria sentido se a intencao fosse distribuir uma build que fala com um backend HTTP, como um IP local de desenvolvimento.

## O que foi corrigido

### 1. Perfil EAS

O perfil `android-apk` agora define:

```json
"env": {
  "APP_ENV": "production"
}
```

Arquivo:

- [eas.json](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/eas.json)

### 2. Resolucao do ambiente no app config

O [app.config.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/app.config.ts) agora trata explicitamente `android-apk` como perfil de producao.

Com isso, a build passa a embutir:

- `APP_ENV = production`
- `API_URL = https://connect.pilardaterra.com.br/api`

## Como validar a URL embutida no app

Antes de gerar a APK, rode:

```bash
cd apps/mobile
$env:EAS_BUILD_PROFILE='android-apk'
npx expo config --type public --json
```

No JSON final, confirme:

- `extra.APP_ENV = production`
- `extra.API_URL = https://connect.pilardaterra.com.br/api`

## Como evitar esse problema em builds futuras

1. Sempre gere APK de distribuicao usando o perfil `android-apk`.
2. Mantenha `APP_ENV=production` definido nesse perfil.
3. Antes de publicar, valide o `expo config --type public --json`.
4. So considere `usesCleartextTraffic` se existir uma necessidade real de backend HTTP.

## Observacao operacional

Depois dessa correcao, e necessario gerar uma nova APK para que a configuracao correta seja embutida no binario.
