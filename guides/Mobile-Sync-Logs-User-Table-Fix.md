# Mobile Sync Logs User Table Fix

## Problema

Ao abrir `/configuracoes/mobile/logs`, a API falhava com:

`relation "User" does not exist`

O erro acontecia em `apps/api/src/mobile-sync/mobile-sync.receipts.repository.ts`, nos métodos:

- `listLogs`
- `listLogUsers`

## Causa raiz

O problema não era apenas `model` Prisma versus nome físico de tabela.

Havia uma divergência mais importante:

- os recibos de sincronização (`pdtconnect.mobile_event_receipts`) são lidos no banco operacional configurado por `PG_*`
- esse banco é o `vr`
- a tabela `"User"` pertence ao banco da aplicação configurado por `DATABASE_URL`
- portanto o SQL bruto tentava fazer `JOIN` com uma tabela que não existe naquele banco

Na prática:

- `mobile_event_receipts` existe no banco `vr`
- `"User"` não existe no banco `vr`
- `"Store"` também não era a melhor referência ali
- a tabela real de loja disponível no banco operacional é `public.loja`

## Diferença entre model e tabela real

No Prisma, existem os models:

- `User`
- `Store`

Mas isso vale para o banco da aplicação (`DATABASE_URL`), não para o banco operacional usado pelo `PgService`.

No banco operacional consultado pelo repository dos logs, as tabelas relevantes são:

- `pdtconnect.mobile_event_receipts`
- `public.loja`
- `public.usuario`

Mesmo assim, `public.usuario` não podia ser usado para o join dos logs, porque `mobile_event_receipts.user_id` guarda o ID do usuário autenticado da aplicação, não o ID do `usuario` do VRMaster.

## Como a query foi corrigida

### Loja

O join de loja deixou de usar `"Store"` e passou a usar a tabela real do banco operacional:

- `LEFT JOIN public.loja l ON l.id = r.store_id`

O label exibido passou a vir de:

- `l.descricao`

com fallback para `Loja <id>`.

### Usuário

O join SQL com `"User"` foi removido.

Agora o fluxo faz:

1. consulta os recibos em `pdtconnect.mobile_event_receipts` no banco operacional
2. extrai os `user_id` distintos retornados
3. busca os usuários correspondentes via Prisma no banco da aplicação
4. enriquece a resposta em memória com:
   - `name`
   - `email`
   - `codigoUsuarioVrMaster`

O mesmo ajuste foi aplicado em:

- `listLogs`
- `listLogUsers`

## Como evitar esse erro em SQL bruto

1. Sempre confirmar em qual banco cada service está executando:
   - `PgService` usa `PG_*`
   - `PrismaService` usa `DATABASE_URL`

2. Não assumir que o nome do model Prisma existe como tabela no banco acessado por SQL bruto.

3. Em queries raw, validar antes:
   - schema real
   - nome físico da tabela
   - se o dado relacionado está no mesmo banco ou em outro

4. Quando o relacionamento atravessar bancos lógicos diferentes:
   - evitar `JOIN` direto
   - consultar no banco correto e enriquecer em camada de aplicação

## Resultado esperado

Com a correção:

- `/configuracoes/mobile/logs` volta a carregar
- o filtro por usuário continua funcionando
- a lista de usuários continua disponível
- a listagem de logs continua paginada e filtrável
- a loja continua sendo exibida corretamente
