FROM node:20

# Instala cliente PostgreSQL 16 (pg_dump 16)
RUN apt-get update && \
    apt-get install -y wget gnupg lsb-release && \
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg && \
    apt-get update && \
    apt-get install -y postgresql-client-16 && \
    rm -rf /var/lib/apt/lists/*

# Diretório raiz
WORKDIR /usr/src/app

# Copiar configs primeiro (melhora cache)
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig*.json ./

# Instalar dependências
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar o resto do código
COPY . .

# Build backend (NestJS)
RUN npm run build

# Build frontend (Vite)
WORKDIR /usr/src/app/front
RUN npm install && npm run build

# Voltar pro backend
WORKDIR /usr/src/app

EXPOSE 4495
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start:prod"]