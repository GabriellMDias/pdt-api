# Web Mobile Releases QRCode

## Onde o QR Code foi adicionado

O QR Code foi adicionado na tela:

- `/configuracoes/mobile/releases`

Mais especificamente no bloco:

- `Resumo da release atual`

Arquivos principais:

- `apps/web/src/pages/configuracoes/mobile-releases/MobileReleasesPage.tsx`
- `apps/web/src/pages/configuracoes/mobile-releases/ReleaseDownloadQrCode.tsx`

## Qual URL ele usa

O QR Code usa exatamente a URL pública da release atual:

- `latestRelease.latestDownloadUrl`

Esse campo já vem da API e é montado no backend em `MobileUpdatesService` com `buildAbsoluteUrl(...)`, apontando para o download público da APK Android mais recente.

## Quando ele aparece

O QR Code só aparece quando:

1. existe uma `latestRelease`
2. `latestRelease.latestDownloadUrl` existe e não está vazio

Se não houver release atual válida, o bloco continua mostrando apenas o estado vazio já existente.

## Biblioteca / abordagem usada

Foi usada a biblioteca:

- `react-qr-code`

Motivo:

- leve
- renderiza em SVG
- integra bem com React
- suficiente para gerar um QR limpo e fácil de escanear

## Integração visual

O QR Code foi integrado no mesmo card-resumo da release atual, sem substituir o link público existente.

O bloco mantém:

- dados da versão
- build
- data de publicação
- link público
- QR Code para escanear no celular

## Limitações

1. O QR Code reflete a URL pública retornada pela API. Se o host público da API mudar, o backend precisa continuar montando essa URL corretamente.
2. Como a mudança é frontend, é necessário publicar a versão web atualizada para o QR aparecer aos usuários.
