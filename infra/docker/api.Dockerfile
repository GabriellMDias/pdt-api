FROM node:20

# Instala cliente PostgreSQL 16 (pg_dump 16)
RUN apt-get update && \
    apt-get install -y wget gnupg lsb-release && \
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg && \
    apt-get update && \
    apt-get install -y postgresql-client-16 && \
    rm -rf /var/lib/apt/lists/*

# Diretorio raiz do monorepo
WORKDIR /usr/src/app

# Copia manifests primeiro para melhorar cache das dependencias
COPY package.json ./package.json
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

# Instala dependencias dos dois projetos usados em producao
RUN npm ci --prefix apps/api && npm ci --prefix apps/web

# Copia codigo fonte do backend e frontend
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Gera Prisma Client e builda os projetos
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --prefix apps/api
RUN npm run build --prefix apps/web

# Backend roda a partir de apps/api
WORKDIR /usr/src/app/apps/api

EXPOSE 4495
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start:prod"]
