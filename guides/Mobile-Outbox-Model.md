# Mobile Outbox Model

## Objetivo

Este documento detalha o modelo local de outbox recomendado para o novo app mobile.

Escopo:

- tabela principal de outbox no SQLite
- tabelas auxiliares de sync
- status locais
- politica de retry
- regras de reconciliacao
- classificacao de erros temporarios vs permanentes

## Principios do modelo

- cada evento tem um `event_id` imutavel
- o `event_id` nasce quando a operacao local e registrada
- o `event_id` sobrevive a retries, reconnects e reinicio do app
- o estado do envio nao apaga o dado funcional da feature
- a outbox e global do app, mas cada linha pertence a um `user_id` e `store_id`

## Tabela principal: `sync_outbox`

Estrutura sugerida:

| Coluna | Tipo SQLite | Obrigatoria | Papel |
| --- | --- | --- | --- |
| `event_id` | `TEXT` | sim | PK logica; usar UUID v7 em string |
| `batch_id` | `TEXT` | nao | identificador do ultimo batch de transporte |
| `event_type` | `TEXT` | sim | nome canonico do evento, ex. `ruptura.reported` |
| `aggregate_type` | `TEXT` | sim | entidade funcional, ex. `ruptura_item`, `balanco_item` |
| `aggregate_key` | `TEXT` | sim | chave funcional para rastreio local, sem substituir `event_id` |
| `store_id` | `INTEGER` | sim | loja do evento |
| `user_id` | `INTEGER` | sim | usuario que coletou o evento |
| `device_id` | `TEXT` | sim | identificador estavel do dispositivo/instalacao |
| `schema_version` | `INTEGER` | sim | versao do payload do evento |
| `payload_json` | `TEXT` | sim | JSON canonico do evento |
| `payload_hash` | `TEXT` | sim | SHA-256 do payload canonico |
| `status` | `TEXT` | sim | `pending`, `sending`, `success`, `failed` |
| `failure_class` | `TEXT` | sim | `none`, `temporary`, `permanent` |
| `attempt_count` | `INTEGER` | sim | numero de tentativas de envio |
| `last_attempt_at` | `TEXT` | nao | ultima tentativa |
| `next_attempt_at` | `TEXT` | nao | agenda do proximo retry |
| `locked_at` | `TEXT` | nao | lease local para evitar worker duplicado |
| `locked_by` | `TEXT` | nao | identificador do worker atual |
| `last_http_status` | `INTEGER` | nao | status HTTP da ultima tentativa |
| `last_error_code` | `TEXT` | nao | codigo tecnico ou de negocio |
| `last_error_message` | `TEXT` | nao | mensagem curta para suporte e UI |
| `server_ack_status` | `TEXT` | nao | ultimo status conhecido do backend |
| `server_receipt_id` | `TEXT` | nao | id interno do receipt no backend, se houver |
| `server_processed_at` | `TEXT` | nao | horario do backend para conclusao |
| `created_at` | `TEXT` | sim | criacao local do evento |
| `updated_at` | `TEXT` | sim | ultima alteracao local do registro |

## SQL sugerido

```sql
CREATE TABLE IF NOT EXISTS sync_outbox (
  event_id TEXT PRIMARY KEY NOT NULL,
  batch_id TEXT,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_key TEXT NOT NULL,
  store_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'success', 'failed')),
  failure_class TEXT NOT NULL DEFAULT 'none'
    CHECK (failure_class IN ('none', 'temporary', 'permanent')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_attempt_at TEXT,
  locked_at TEXT,
  locked_by TEXT,
  last_http_status INTEGER,
  last_error_code TEXT,
  last_error_message TEXT,
  server_ack_status TEXT,
  server_receipt_id TEXT,
  server_processed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_dispatch
  ON sync_outbox (status, failure_class, next_attempt_at, store_id, user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_batch
  ON sync_outbox (batch_id);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_aggregate
  ON sync_outbox (aggregate_type, aggregate_key);
```

## Tabelas auxiliares recomendadas

### `sync_pull_state`

Papel:

- guardar cursor/checkpoint por dominio e loja

Estrutura sugerida:

| Coluna | Tipo | Papel |
| --- | --- | --- |
| `domain` | `TEXT` | ex. `catalog.products` |
| `store_id` | `INTEGER` | loja do dominio |
| `cursor` | `TEXT` | cursor opaco devolvido pela API |
| `snapshot_version` | `TEXT` | versao declarada pelo backend |
| `last_synced_at` | `TEXT` | horario do ultimo pull concluido |
| `updated_at` | `TEXT` | manutencao local |

Chave sugerida:

- PK composta: `(domain, store_id)`

### `sync_receipt_cache`

Papel:

- cache curto de receipts para reconciliacao e diagnostico

Estrutura sugerida:

| Coluna | Tipo | Papel |
| --- | --- | --- |
| `event_id` | `TEXT` | chave do evento |
| `receipt_status` | `TEXT` | ultimo estado conhecido no backend |
| `receipt_payload_json` | `TEXT` | ACK/receipt bruto |
| `fetched_at` | `TEXT` | quando foi consultado |

### `sync_runtime_state`

Papel:

- estado leve do worker local

Colunas uteis:

- `key`
- `value`
- `updated_at`

Exemplos de chave:

- `sync_device_id`
- `sync_worker_last_run_at`
- `sync_worker_last_success_at`

## Regras de gravacao

Cada operacao funcional deve abrir uma transacao SQLite e:

1. gravar a linha em `op_*`
2. gravar a linha em `sync_outbox`

Campos minimos a montar no momento da coleta:

- `event_id`
- `event_type`
- `aggregate_type`
- `aggregate_key`
- `store_id`
- `user_id`
- `device_id`
- `schema_version`
- `payload_json`
- `payload_hash`
- `status = 'pending'`
- `failure_class = 'none'`
- `attempt_count = 0`
- `created_at`
- `updated_at`

## Regra para `device_id`

Recomendacao:

- gerar um UUID aleatorio uma unica vez por instalacao
- armazenar em `app_meta` ou `sync_runtime_state`

Motivo:

- ajuda auditoria e receipts
- nao depende de identificador nativo sensivel
- permanece estavel entre eventos do mesmo app

## Estado local e transicoes

| Estado | Quando entra | Quando sai |
| --- | --- | --- |
| `pending` | evento criado ou recolocado para retry | ao ser reservado para envio |
| `sending` | worker reservou o evento para um batch | quando recebe ACK, quando entra em reconciliacao ou quando expira lease |
| `success` | backend respondeu `applied` ou `duplicate` | estado terminal |
| `failed` | backend ou transporte devolveu erro | vai para terminal se `permanent`, ou volta a elegivel se `temporary` |

Complemento por classe:

- `failed` + `temporary`: o item segue na fila e volta a ser selecionavel em `next_attempt_at`
- `failed` + `permanent`: o item para de reenviar automaticamente e precisa de acao de usuario ou suporte

## Lease local e protecao contra worker duplicado

Mesmo em um unico app, vale tratar o envio como um recurso com lease.

Regras sugeridas:

- ao selecionar um lote, preencher `locked_at` e `locked_by`
- usar um `locked_by` simples, ex. `foreground-worker`
- se `sending` ficar velho alem de `request_timeout + grace_window`, considerar o lease expirado

Janela inicial sugerida:

- `request_timeout = 15s`
- `grace_window = 30s`

Total:

- apos `45s` sem desfecho, o evento passa a ser candidato a reconciliacao

## Algoritmo sugerido do worker

### Selecao

Selecionar somente linhas:

- `status = 'pending'`
- ou `status = 'failed' AND failure_class = 'temporary' AND next_attempt_at <= now`
- ou `status = 'sending'` com lease expirado para reconciliacao

Filtros adicionais:

- somente do `user_id` autenticado no momento
- somente da `store_id` ativa no momento

### Reserva

Antes de enviar:

- gerar `batch_id`
- atualizar `status = 'sending'`
- incrementar `attempt_count`
- preencher `last_attempt_at`, `locked_at`, `locked_by`, `updated_at`

### Resposta do backend

Para cada ACK:

- `applied` -> `status = 'success'`, `failure_class = 'none'`
- `duplicate` -> `status = 'success'`, `failure_class = 'none'`
- `rejected` -> `status = 'failed'`, `failure_class = 'permanent'`
- `retry_later` -> `status = 'failed'`, `failure_class = 'temporary'`, reagendar
- `processing` -> manter `status = 'sending'` e programar reconciliacao curta

### Falha sem ACK

Se houver:

- timeout
- erro de rede
- queda de internet
- 5xx sem corpo utilizavel

Regra:

- manter `status = 'sending'`
- limpar ou expirar o lease
- colocar o item em fila de reconciliacao

O app nao deve assumir que falhou no backend.

## Reconciliacao de eventos ambiguos

Evento ambiguo:

- item local em `sending`
- sem ACK terminal
- lease expirado

Fluxo sugerido:

1. consultar receipts por `event_id`
2. se receipt for `applied` ou `duplicate`, fechar como `success`
3. se receipt for `rejected`, marcar `failed/permanent`
4. se receipt for `retry_later`, marcar `failed/temporary`
5. se o backend disser `not_found`, recolocar em `pending`

Regras de UX:

- o usuario nao precisa reenviar manualmente logo apos reconnect
- a reconciliacao deve rodar antes de um novo resend cego

## Politica de retry com backoff

Formula recomendada:

- `delay = min(3600s, 5s * 2^(attempt_count - 1))`
- aplicar jitter de `80%` a `120%`

Sequencia aproximada:

- tentativa 1 -> `5s`
- tentativa 2 -> `10s`
- tentativa 3 -> `20s`
- tentativa 4 -> `40s`
- tentativa 5 -> `80s`
- tentativa 6 -> `160s`
- tentativa 7+ -> cap progressivo ate `60m`

Regra especial:

- se a API devolver `Retry-After`, usar o maior valor entre o backoff calculado e o `Retry-After`

## Erros temporarios vs permanentes

### Temporarios

Devem virar `failed` + `failure_class = temporary`.

Exemplos:

- dispositivo offline
- timeout de rede
- DNS/transporte
- HTTP `408`
- HTTP `425`
- HTTP `429`
- HTTP `500`
- HTTP `502`
- HTTP `503`
- HTTP `504`
- ACK item a item com `retry_later`
- ACK item a item com `processing`

Tratamento:

- manter o mesmo `event_id`
- reagendar
- tentar reconciliacao antes de reenvios sucessivos quando houver estado ambiguo

### Permanentes

Devem virar `failed` + `failure_class = permanent`.

Exemplos:

- envelope invalido conhecido localmente
- HTTP `400` por payload estrutural invalido
- HTTP `401` ou `403` para o usuario atual
- conflito de `event_id` com `payload_hash` diferente
- referencia inexistente ou fora de escopo (`store`, `product`, `balanco`)
- violacao de regra de negocio nao recuperavel pelo mesmo payload
- ACK item a item com `rejected`

Tratamento:

- nao reenviar automaticamente
- guardar `last_error_code` e `last_error_message`
- expor na UI como pendencia de correcao

## Regras para multiusuario e multiloja

Mesmo com o app ainda em fundacao, a outbox deve nascer pronta para:

- eventos de usuarios diferentes no mesmo dispositivo
- eventos de lojas diferentes

Regras sugeridas:

- nao apagar pendencias no logout
- nao reenviar evento de outro usuario automaticamente
- nao reenviar evento de outra loja se a sessao atual nao tiver escopo sobre ela
- a tela de pendencias deve filtrar por `user_id` e `store_id`

## Regras de observabilidade

Campos minimos para suporte:

- `event_id`
- `batch_id`
- `event_type`
- `store_id`
- `user_id`
- `attempt_count`
- `last_http_status`
- `last_error_code`
- `last_error_message`
- `server_ack_status`

Beneficio:

- suporte consegue correlacionar o evento local com o receipt do backend

## Decisoes recomendadas desta etapa

- manter uma outbox unica para todas as features
- usar `status` base `pending/sending/success/failed`
- complementar com `failure_class`
- tratar `event_id` como chave imutavel e `batch_id` como identificador de transporte
- executar reconciliacao antes de retransmissoes cegas
