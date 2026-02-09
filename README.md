# PDT Monorepo

Repositorio organizado em tres projetos:

- `apps/api`: backend NestJS + Prisma (tambem serve o build do frontend).
- `apps/web`: frontend React + Vite.
- `apps/mobile`: app mobile em Expo.

Infraestrutura Docker:

- `infra/docker/docker-compose.yml`
- `infra/docker/api.Dockerfile`

## Estrutura

```text
.
+-- apps
|   +-- api
|   +-- web
|   `-- mobile
+-- infra
|   `-- docker
+-- guides
+-- .env
`-- package.json
```

## Pre-requisitos

- Node.js 20+
- npm
- Docker e Docker Compose

## Desenvolvimento Local

Instale dependencias de todos os apps:

```bash
npm run setup
```

Executar API:

```bash
npm run dev:api
```

Executar Web:

```bash
npm run dev:web
```

Executar Mobile:

```bash
npm run dev:mobile
```

Builds:

```bash
npm run build:api
npm run build:web
```

## Docker

Subir API + PostgreSQL:

```bash
npm run docker:up
```

Parar containers:

```bash
npm run docker:down
```

Parar e remover volumes:

```bash
npm run docker:down:volumes
```

## Variaveis de ambiente

Use o arquivo `.env` na raiz do repositorio. Ele e lido pelo compose em `infra/docker/docker-compose.yml`.

Variaveis principais:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `PORT`
- `DATABASE_URL`
- `SWAGGER_USER`
- `SWAGGER_PASSWORD`
- `JWT_SECRET`

## Observacoes

- O backend serve os arquivos estaticos do web buildados em `apps/web/dist`.
- Uploads e backups ficam em `apps/api/uploads`.
