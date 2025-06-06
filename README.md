# 📦 PdT API

API desenvolvida com NestJS e PostgreSQL, containerizada via Docker. Inclui autenticação JWT, documentação Swagger protegida por login e conexão direta com PostgreSQL via Prisma e `pg`.

---

## 🚀 Como rodar o projeto

### 1. ✅ Pré-requisitos

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

### 2. ⚙️ Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# PostgreSQL
POSTGRES_USER=pdt
POSTGRES_PASSWORD=pdt2020
POSTGRES_PORT=5432

# API
PORT=4495
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pdt

# Swagger
SWAGGER_USER=admin
SWAGGER_PASSWORD=123456

# PGService (VR Database)
PG_DATABASE_USER=postgres
PG_DATABASE_PASSWORD=VrPost@Server
PG_DATABASE_HOST=172.30.5.5
PG_DATABASE_PORT=8745
PG_DATABASE_DATABASE=vr
PG_APPLICATION_NAME=pdt-api

#JWT
JWT_SECRET=superSecretaChaveJWT_98327asduyh1*&YHuhkjh!@2923
```

---

### 3. 🐳 Subindo a aplicação com Docker

Para subir a aplicação e o banco:

```bash
docker-compose up --build
```

Esse comando irá:

- Criar os containers da API e do PostgreSQL
- Rodar as migrações com `npx prisma migrate deploy`
- Executar os seeds, se houver
- Iniciar a aplicação em modo de produção

---

### 4. 📄 Documentação da API

Acesse a documentação Swagger em:

```
http://localhost:4495/api
```

> Será solicitado login:
> - **Usuário:** `admin`
> - **Senha:** `admin123`

---

### 5. 📦 Comandos úteis

#### Derrubar os containers:

```bash
docker-compose down
```

#### Derrubar e apagar volumes (⚠️ remove os dados do banco):

```bash
docker-compose down -v
```

#### Ver status dos containers:

```bash
docker ps
```

---

### 6. 🧪 Testar conexão com banco

Se quiser testar manualmente o banco de dados, execute:

```bash
docker exec -it pdt-api_postgres_1 psql -U postgres -d pdt
```

---

## 🧠 Observações

- A aplicação usa Prisma como ORM, com migrações executadas automaticamente.
- O serviço de banco está com `healthcheck`, garantindo que a API só inicie após o PostgreSQL estar pronto.
- JWT é usado para autenticação das rotas protegidas.

---

## 👨‍💻 Autor

Gabriel Dias  
Engenharia de Computação | Desenvolvedor Backend

---
