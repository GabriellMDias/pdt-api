FROM node:20

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