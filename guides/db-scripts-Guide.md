# Guia do Módulo **db-scripts** (Frontend)

> Este guia explica como **consumir** o módulo de agendamento/execução de scripts SQL/PLpgSQL. Inclui entidades, lógica de cronograma, endpoints, exemplos e recomendações de UI.

---

## Sumário

- [Visão geral](#visão-geral)
- [Autorização & Permissões](#autorização--permissões)
- [Entidades (modelos de resposta)](#entidades-modelos-de-resposta)
- [Lógica de agendamento (schedule)](#lógica-de-agendamento-schedule)
- [Endpoints](#endpoints)
  - [Listar scripts](#1-listar-scripts)
  - [Obter script](#2-obter-script)
  - [Criar script](#3-criar-script)
  - [Atualizar script](#4-atualizar-script)
  - [Habilitar/Desabilitar](#5-habilitar--desabilitar)
  - [Executar agora](#6-executar-agora-manual)
  - [Listar execuções (runs)](#7-listar-execuções-runs)
  - [Excluir script](#8-excluir-script)
- [Exemplos de uso (fetch/axios/curl)](#exemplos-de-uso)
- [Boas práticas de UI/UX](#boas-práticas-de-uiux)
- [Erros comuns & tratamento](#erros-comuns--tratamento)
- [Cheatsheet de CRON (6 campos)](#cheatsheet-de-cron-6-campos)
- [Dicas avançadas](#dicas-avançadas)

---

## Visão geral

O módulo **db-scripts** permite:

- **Cadastrar** scripts SQL/PLpgSQL;
- **Agendar** a execução (CRON, intervalo, diário, semanal);
- **Executar manualmente** (run-now);
- **Auditar** o histórico de execuções (runs).

Características técnicas:

- **Postgres advisory lock** evita execução duplicada em clusters;
- **Timeout por script** (`statement_timeout`);
- **search_path** por script;
- **Transação opcional** por script (`wrapInTransaction`).

---

## Autorização & Permissões

- **Autenticação**: Bearer JWT.
- **Guards**: `JwtAuthGuard` + `PermissionsGuard`.
- **Permissões**:
  - `dbScripts:consultar`
  - `dbScripts:incluir`
  - `dbScripts:editar`
  - `dbScripts:executar`
  - `dbScripts:excluir`

> Sem permissão: API responde `401`/`403`.

---

## Entidades (modelos de resposta)

### `DbScript`

```ts
type DbScript = {
  id: number;
  name: string;
  description?: string | null;
  sqlText: string;

  enabled: boolean;

  scheduleType: 'CRON' | 'INTERVAL' | 'DAILY_AT' | 'WEEKLY_AT';
  cronExpression?: string | null;   // quando CRON (sempre 6 campos)
  intervalSeconds?: number | null;  // quando INTERVAL
  timezone: string;                 // ex.: "America/Sao_Paulo"

  timeoutSec: number;               // em segundos
  wrapInTransaction: boolean;
  searchPath?: string | null;

  lastStatus?: 'SUCCESS' | 'FAILED' | 'SKIPPED' | null;
  latestRunAt?: string | null;      // ISO datetime

  createdAt: string;                // ISO datetime
  updatedAt: string;                // ISO datetime
};
```

### `DbScriptRun`

```ts
type DbScriptRun = {
  id: number;
  scriptId: number;
  startedAt: string;
  finishedAt?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  rowsAffected?: number | null;     // pode vir null em DO $$ ... $$
  error?: string | null;            // msg de erro ou motivo de SKIPPED
  durationMs?: number | null;
  triggeredBy?: 'SCHEDULE' | 'MANUAL' | 'RETRY' | null;
  appInstanceId?: string | null;
};
```

---

## Lógica de agendamento (schedule)

**Tipos**:
- `CRON`: use expressão **com 6 campos** (`sec min hora dia mes dow`).
  - Se enviar 5 campos, o backend **normaliza** adicionando `sec = 0`.
  - `timezone` por script (default `America/Sao_Paulo`).
- `INTERVAL`: usa `intervalSeconds` (≥ 1).
- `DAILY_AT`: açúcar para “todo dia às HH:mm” → vira CRON internamente.
- `WEEKLY_AT`: açúcar para “semanal em weekday (0–6 dom–sáb) às HH:mm” → vira CRON.

**Concorrência**:
- Em múltiplas instâncias, **só 1** executa cada job (advisory lock).
- Na mesma instância, proteção para evitar dois runs simultâneos do **mesmo** script.

**Timeout**:
- `timeoutSec` vira `statement_timeout` por execução.
- Se `wrapInTransaction=true`, é aplicado com `SET LOCAL` dentro de `BEGIN/COMMIT`.

---

## Endpoints

> **Base path**: `/db-scripts` (confirme prefixos globais da API).  
> **Headers**: `Authorization: Bearer <token>`.

### 1) Listar scripts
```
GET /db-scripts
Perm.: dbScripts:consultar
Resp.: DbScript[]
```

### 2) Obter script
```
GET /db-scripts/:id
Perm.: dbScripts:consultar
Resp.: DbScript
```

### 3) Criar script
```
POST /db-scripts
Perm.: dbScripts:incluir
Body.: CreateDbScriptDto
Resp.: DbScript
```

**CreateDbScriptDto** (formas aceitas):

```ts
type CreateDbScriptDto =
  | {
      name: string;
      description?: string;
      sqlText: string;
      enabled?: boolean;            // default true
      wrapInTransaction?: boolean;  // default false
      searchPath?: string;
      timeoutSec?: number;          // default 600
      scheduleType: 'CRON';
      cron: { cron: string; timezone?: string };
    }
  | {
      name: string; sqlText: string;
      scheduleType: 'INTERVAL';
      interval: { everySeconds: number };
      enabled?: boolean; wrapInTransaction?: boolean; searchPath?: string; timeoutSec?: number;
    }
  | {
      name: string; sqlText: string;
      scheduleType: 'DAILY_AT';
      dailyAt: { time: string; timezone?: string }; // 'HH:mm'
      enabled?: boolean; wrapInTransaction?: boolean; searchPath?: string; timeoutSec?: number;
    }
  | {
      name: string; sqlText: string;
      scheduleType: 'WEEKLY_AT';
      weeklyAt: { weekday: number; time: string; timezone?: string }; // 0=Dom .. 6=Sáb
      enabled?: boolean; wrapInTransaction?: boolean; searchPath?: string; timeoutSec?: number;
    };
```

### 4) Atualizar script
```
PATCH /db-scripts/:id
Perm.: dbScripts:editar
Body.: Partial<CreateDbScriptDto>
Resp.: DbScript
```
> Pode trocar `scheduleType`; o backend **reagenda** automaticamente.

### 5) Habilitar / Desabilitar
```
PATCH /db-scripts/:id/enable
PATCH /db-scripts/:id/disable
Perm.: dbScripts:editar
Resp.: DbScript
```

### 6) Executar agora (manual)
```
POST /db-scripts/:id/run-now
Perm.: dbScripts:executar
Resp.: { ok: true }
```
> Este endpoint **dispara** e retorna imediatamente.  
> Para ver o resultado, consulte os **runs**.

### 7) Listar execuções (runs)
```
GET /db-scripts/:id/runs
Perm.: dbScripts:consultar
Query (opcional): ?page=1&pageSize=50
Resp.:
  - Sem paginação → DbScriptRun[] (200 mais recentes)
  - Com paginação → { items: DbScriptRun[]; total; page; pageSize; totalPages }
```

### 8) Excluir script
```
DELETE /db-scripts/:id
Perm.: dbScripts:excluir
Resp.: { ok: true }
```
> Desagenda o job e apaga o histórico em transação segura.

---

## Exemplos de uso

### Criar (CRON horário) — `axios`
```ts
import axios from 'axios';

const body = {
  name: 'CRON de hora em hora',
  description: 'Executa de hora em hora',
  sqlText: "DO $$ BEGIN RAISE NOTICE 'ok'; END $$ LANGUAGE plpgsql;",
  enabled: true,
  scheduleType: 'CRON',
  cron: { cron: '0 0 * * * *', timezone: 'America/Sao_Paulo' },
  timeoutSec: 120,
};

const { data } = await axios.post<DbScript>('/db-scripts', body, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Criar (intervalo 45s) — `curl`
```bash
curl -X POST 'http://localhost:4495/db-scripts' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{
  "name": "Worker 45s",
  "sqlText": "SELECT now();",
  "scheduleType": "INTERVAL",
  "interval": { "everySeconds": 45 }
}
JSON
```

### Executar agora e acompanhar (polling simples)
```ts
// dispara
await axios.post(`/db-scripts/${id}/run-now`, null, {
  headers: { Authorization: `Bearer ${token}` },
});

// polling por ~5s
const t0 = Date.now();
let last: DbScriptRun[] = [];
while (Date.now() - t0 < 5000) {
  const { data } = await axios.get<DbScriptRun[]>(`/db-scripts/${id}/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (data.length && (!last.length || data[0].id !== last[0].id)) {
    // atualize a UI com o run mais recente
    last = data;
  }
  await new Promise(r => setTimeout(r, 800));
}
```

### Atualizar para diário 09:00
```ts
await axios.patch<DbScript>(`/db-scripts/${id}`, {
  scheduleType: 'DAILY_AT',
  dailyAt: { time: '09:00', timezone: 'America/Sao_Paulo' },
}, { headers: { Authorization: `Bearer ${token}` }});
```

### Excluir
```ts
await axios.delete(`/db-scripts/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Boas práticas de UI/UX

- **Form por etapas**:
  1) Básico (nome/descrição);
  2) **Editor SQL** (monoespaçado, syntax highlight);
  3) **Agendamento** (tabs: CRON / Intervalo / Diário / Semanal);
  4) Avançado: `timeoutSec`, `wrapInTransaction`, `searchPath`, `timezone`;
  5) **Resumo** (mostrar expressão final).

- **Listagem**: nome, enabled, rótulo do schedule, último status (`lastStatus`), último horário (`latestRunAt`); ações: **Enable/Disable**, **Run now**, **Editar**, **Excluir**.

- **Histórico (runs)**: tabela com status badge, `startedAt` → `finishedAt` + `durationMs`, `error` (tooltip/accordion), `triggeredBy`, `appInstanceId`. Suporte a **paginação** ou **cursor**.

- **Feedback**:
  - `SKIPPED` → mensagem amigável: “Execução foi pulada porque já há uma instância rodando este job.”
  - `FAILED` → destaque e exiba `error`.

---

## Erros comuns & tratamento

- `400 Bad Request` — validação (cron inválido, `intervalSeconds < 1`, etc.)
- `401 Unauthorized` — sem token.
- `403 Forbidden` — sem permissão.
- `404 Not Found` — script inexistente.

**Formato típico Nest:**
```json
{
  "statusCode": 400,
  "message": ["scheduleType must be a valid enum value"],
  "error": "Bad Request"
}
```

---

## Cheatsheet de CRON (6 campos)

| Expressão            | Significado                        |
|----------------------|------------------------------------|
| `0 * * * * *`        | A cada minuto (segundo 0)          |
| `0 0 * * * *`        | A cada hora                        |
| `0 0 9 * * *`        | Todo dia às 09:00                  |
| `0 30 10 * * 2`      | Terças às 10:30                    |
| `0 */5 * * * *`      | A cada 5 minutos                   |
| `15 0 2 1 * *`       | Dia 1 de cada mês às 02:00 (s=15)  |

> Se enviar 5 campos, o backend adiciona `0` nos **segundos**.

---

## Dicas avançadas

- **SQL “seguro” no JSON**: prefira enviar por **arquivo** ou **heredoc** no `curl` para não se atrapalhar com aspas (`'`/`"`).
- **DO $$ ... $$**: finalize com `LANGUAGE plpgsql;`. Exemplo:
  ```sql
  DO $$
  BEGIN
    RAISE NOTICE 'ok';
  END
  $$ LANGUAGE plpgsql;
  ```
- **`rowsAffected`**: `null` em `DO $$ ... $$` é esperado.
- **Fuso horário**: exiba `timezone` no rótulo (ex.: “Diário 09:00 (America/Sao_Paulo)”).
- **Pooling**: backend usa `pg.Pool` — cada execução tem conexão dedicada (config de sessão não vaza).

---
