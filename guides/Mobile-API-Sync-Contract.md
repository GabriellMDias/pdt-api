# Mobile API Sync Contract

## Objetivo

Este documento define o contrato recomendado da API para sincronizacao do novo app mobile.

Escopo:

- endpoint de push de eventos
- endpoint de pull de dados mestres
- endpoint opcional de consulta de receipts/status
- envelope, respostas e regras de erro
- estrutura recomendada de receipt/idempotencia no backend

## Base analisada do repositorio

O que ja existe e deve ser preservado:

- `POST /api/auth/login`
- `GET /api/account/me`
- `GET /api/users/mobile-sync`

Conclusao pratica:

- o contrato abaixo nasce como um modulo novo de sync operacional
- ele nao substitui o login atual nem o bootstrap de usuarios offline

## Prefixo e autenticacao

Prefixo real atual da API:

- `/api`

Autenticacao recomendada para os novos endpoints:

- JWT Bearer, no mesmo padrao da API atual

Observacao:

- a autorizacao por `storeId` deve ser validada explicitamente no modulo de sync
- nao basta depender do `PermissionsGuard` atual, porque ele ainda nao checa o escopo por loja

## Endpoints recomendados

### 1. Push de eventos

Rota sugerida:

- `POST /api/mobile-sync/events/push`

Objetivo:

- receber batches de eventos operacionais da outbox
- devolver ACK granular por item
- aplicar idempotencia por `event_id`

### 2. Pull de dados mestres

Rota sugerida:

- `POST /api/mobile-sync/masters/pull`

Objetivo:

- sincronizar catalogos e acessos por dominio e loja
- suportar cursor incremental por dominio

### 3. Consulta de receipts/status

Rota sugerida:

- `POST /api/mobile-sync/receipts/query`

Objetivo:

- reconciliar eventos que ficaram ambiguos apos timeout, reconnect ou reinicio do app

## Contrato de push de eventos

## Request

```json
{
  "batchId": "0195d8f8-5f77-7f3c-8eb9-c57ab2a4f201",
  "deviceId": "f7a4548b-3d4c-4c44-a3d5-1d7a8f4e6b31",
  "storeId": 12,
  "sentAt": "2026-03-18T14:52:10.000Z",
  "events": [
    {
      "eventId": "0195d8f8-5f80-7339-9b2f-493c32650111",
      "eventType": "ruptura.reported",
      "schemaVersion": 1,
      "aggregateType": "ruptura_item",
      "aggregateKey": "RUPTURA:12:PRATELEIRA-A1:7890",
      "occurredAt": "2026-03-18T14:51:02.000Z",
      "payloadHash": "7ae5f8d7f0a1d4f8e8df3b7a6bd0d3c8941ec6f355e3aa52bbfd1b0ad9dcd3aa",
      "payload": {
        "storeId": 12,
        "shelfCode": "PRATELEIRA-A1",
        "productIds": [7890, 7891]
      }
    }
  ]
}
```

## Regras do envelope

- `batchId` identifica a tentativa de transporte, nao a idempotencia final
- `eventId` e a chave unica de idempotencia
- `deviceId` identifica a instalacao/origem
- `storeId` no envelope e obrigatorio e deve bater com todos os itens do batch
- o usuario autenticado vem do JWT, nao do body
- o backend deve validar que o usuario pode operar na `storeId`

## Regras por evento

Campos obrigatorios por item:

- `eventId`
- `eventType`
- `schemaVersion`
- `aggregateType`
- `aggregateKey`
- `occurredAt`
- `payloadHash`
- `payload`

Regra de idempotencia:

- mesmo `eventId` + mesmo `payloadHash` => replay seguro
- mesmo `eventId` + hash diferente => conflito permanente

## Response

```json
{
  "batchId": "0195d8f8-5f77-7f3c-8eb9-c57ab2a4f201",
  "storeId": 12,
  "serverReceivedAt": "2026-03-18T14:52:11.102Z",
  "acks": [
    {
      "eventId": "0195d8f8-5f80-7339-9b2f-493c32650111",
      "receiptId": "0195d8f8-60a1-7f59-9b15-5488156ec555",
      "status": "applied",
      "processedAt": "2026-03-18T14:52:11.420Z",
      "errorCode": null,
      "message": null,
      "retryAfterMs": null
    }
  ],
  "summary": {
    "total": 1,
    "applied": 1,
    "duplicate": 0,
    "processing": 0,
    "retryLater": 0,
    "rejected": 0
  }
}
```

## Status de ACK recomendados

| Status | Significado | Efeito no mobile |
| --- | --- | --- |
| `applied` | processado com sucesso nesta chamada | marcar `success` |
| `duplicate` | ja processado antes com o mesmo `eventId` e hash | marcar `success` |
| `processing` | existe receipt em andamento sem estado terminal | manter em reconciliacao |
| `retry_later` | falha temporaria ou lock transitorio | marcar `failed/temporary` |
| `rejected` | erro permanente de contrato, permissao ou negocio | marcar `failed/permanent` |

## Regras de resposta

- para um envelope valido, a API deve responder `200` com `acks[]` completos
- a API nao deve responder so com sucesso/erro de lote
- cada item precisa ter um desfecho explicito

Codigos HTTP recomendados:

| HTTP | Quando usar |
| --- | --- |
| `200` | envelope valido, mesmo com mistura de sucesso e erro por item |
| `400` | envelope invalido, campos obrigatorios ausentes, JSON malformado |
| `401` | JWT ausente ou invalido |
| `403` | usuario sem permissao para sync ou sem escopo na loja |
| `413` | lote maior que o limite aceito |
| `429` | limite temporario global da API |
| `500` | falha inesperada antes de produzir `acks[]` |
| `503` | indisponibilidade total antes da avaliacao item a item |

## Contrato de pull de dados mestres

## Request

```json
{
  "deviceId": "f7a4548b-3d4c-4c44-a3d5-1d7a8f4e6b31",
  "storeId": 12,
  "domains": [
    { "domain": "access", "cursor": null },
    { "domain": "catalog.products", "cursor": "opaque-cursor-1" },
    { "domain": "catalog.packaging-types", "cursor": null },
    { "domain": "catalog.exchange-reasons", "cursor": null },
    { "domain": "catalog.consumption-types", "cursor": null },
    { "domain": "catalog.recipes", "cursor": "opaque-cursor-2" },
    { "domain": "catalog.balancos", "cursor": "opaque-cursor-3" }
  ]
}
```

## Response

```json
{
  "storeId": 12,
  "serverTime": "2026-03-18T15:03:00.000Z",
  "domains": [
    {
      "domain": "access",
      "mode": "replace",
      "nextCursor": "opaque-access-cursor",
      "items": [
        {
          "allowedStores": [12, 15],
          "permissions": [
            { "code": "ruptura:coletar", "stores": [12] },
            { "code": "balanco:coletar", "stores": [12, 15] }
          ]
        }
      ],
      "deletedKeys": []
    },
    {
      "domain": "catalog.products",
      "mode": "merge",
      "nextCursor": "opaque-products-cursor",
      "items": [
        {
          "id": 7890,
          "barcode": "7891234567890",
          "description": "Produto Exemplo",
          "packagingTypeId": 4,
          "allowsDecimal": true,
          "updatedAt": "2026-03-18T12:00:00.000Z"
        }
      ],
      "deletedKeys": []
    }
  ]
}
```

## Regras do pull

- o cursor deve ser opaco para o mobile
- o backend pode usar internamente `updated_at + id`, versao numerica ou snapshot token
- `mode = replace` indica que o mobile deve substituir o dominio inteiro daquele escopo
- `mode = merge` indica aplicacao incremental por upsert/delete
- `deletedKeys` permite remocoes sem full refresh

Dominios iniciais recomendados:

- `access`
- `catalog.stores`
- `catalog.products`
- `catalog.packaging-types`
- `catalog.exchange-reasons`
- `catalog.consumption-types`
- `catalog.recipes`
- `catalog.balancos`

Observacao:

- o bootstrap de usuarios offline pode continuar em `GET /api/users/mobile-sync`
- o dominio `access` deve complementar esse bootstrap com permissao por loja

## Contrato de consulta de receipts/status

## Request

```json
{
  "deviceId": "f7a4548b-3d4c-4c44-a3d5-1d7a8f4e6b31",
  "storeId": 12,
  "eventIds": [
    "0195d8f8-5f80-7339-9b2f-493c32650111",
    "0195d8f8-5f81-7bd6-a0f1-53bc9f4d0212"
  ]
}
```

## Response

```json
{
  "storeId": 12,
  "serverTime": "2026-03-18T15:07:00.000Z",
  "receipts": [
    {
      "eventId": "0195d8f8-5f80-7339-9b2f-493c32650111",
      "receiptId": "0195d8f8-60a1-7f59-9b15-5488156ec555",
      "status": "applied",
      "processedAt": "2026-03-18T14:52:11.420Z",
      "errorCode": null,
      "message": null
    },
    {
      "eventId": "0195d8f8-5f81-7bd6-a0f1-53bc9f4d0212",
      "receiptId": null,
      "status": "not_found",
      "processedAt": null,
      "errorCode": null,
      "message": null
    }
  ]
}
```

## Uso recomendado do endpoint de receipts

- reconnect apos perda de internet
- bootstrap do app com itens `sending` antigos
- timeout de request sem ACK final
- auditoria e suporte

## Estrutura recomendada de receipt/idempotencia no backend

Recomendacao principal:

- usar o schema `pdtconnect` no Postgres acessado pelo `PgService`
- processar receipt e regra do ERP na mesma transacao

Tabela sugerida:

- `pdtconnect.mobile_event_receipt`

## Colunas sugeridas

| Coluna | Tipo sugerido | Papel |
| --- | --- | --- |
| `id` | `UUID` | PK tecnica do receipt |
| `event_id` | `UUID` | unico por evento mobile |
| `event_hash` | `VARCHAR(64)` | hash canonico do payload |
| `batch_id` | `UUID` | ultimo batch observado |
| `device_id` | `VARCHAR(120)` | origem do evento |
| `user_id` | `INTEGER` | usuario autenticado |
| `store_id` | `INTEGER` | loja do evento |
| `event_type` | `VARCHAR(120)` | tipo do evento |
| `schema_version` | `INTEGER` | versao do payload |
| `status` | `VARCHAR(24)` | `processing`, `applied`, `retry_later`, `rejected` |
| `aggregate_type` | `VARCHAR(80)` | entidade funcional |
| `aggregate_key` | `VARCHAR(255)` | rastreio funcional |
| `payload_json` | `JSONB` | payload bruto do evento |
| `ack_json` | `JSONB` | ACK canonico devolvido ao mobile |
| `error_code` | `VARCHAR(80)` | codigo tecnico ou de negocio |
| `error_message` | `TEXT` | detalhe resumido |
| `first_received_at` | `TIMESTAMPTZ` | primeira vez em que a API viu o evento |
| `last_received_at` | `TIMESTAMPTZ` | ultimo replay recebido |
| `processing_started_at` | `TIMESTAMPTZ` | inicio do processamento |
| `processed_at` | `TIMESTAMPTZ` | desfecho terminal |

## Constraints e indices recomendados

- `UNIQUE (event_id)`
- indice por `(store_id, user_id, status, processed_at desc)`
- indice por `(batch_id)`
- opcional: indice por `(event_type, processed_at desc)`

## Regras de idempotencia recomendadas

### Caso 1: evento novo

- inserir receipt com `status = processing`
- processar regra do ERP
- atualizar receipt para `applied`, `retry_later` ou `rejected`

### Caso 2: `event_id` repetido com mesmo hash

- se o estado anterior for terminal, devolver replay coerente
- se estiver `processing`, devolver `processing`

### Caso 3: `event_id` repetido com hash diferente

- nao processar
- devolver `rejected` com `errorCode = EVENT_ID_PAYLOAD_CONFLICT`

## Transacao recomendada no backend

Por item:

1. abrir transacao no `PgService`
2. reservar/verificar o receipt em `pdtconnect.mobile_event_receipt`
3. executar a regra do ERP
4. persistir o ACK final na mesma transacao
5. commitar

Resultado:

- se a API cair antes do commit, nem ERP nem receipt ficam aplicados
- se o commit acontecer, o replay encontra o receipt final e nao duplica o efeito

## Regras para erros temporarios vs permanentes na API

### Temporarios

Devem retornar ACK `retry_later` por item ou HTTP transitorio no lote.

Exemplos:

- lock temporario
- timeout interno de dependencia
- ERP indisponivel
- limitacao de throughput
- falha de infraestrutura recuperavel

Codigos sugeridos:

- `ERP_TEMP_UNAVAILABLE`
- `RATE_LIMITED`
- `LOCK_TIMEOUT`
- `DEPENDENCY_TIMEOUT`

### Permanentes

Devem retornar ACK `rejected` por item.

Exemplos:

- usuario sem permissao na loja
- referencia inexistente
- payload invalido para a `schemaVersion`
- conflito de `event_id` com hash diferente
- evento incompativel com o estado atual de negocio

Codigos sugeridos:

- `STORE_SCOPE_DENIED`
- `REFERENCE_NOT_FOUND`
- `VALIDATION_ERROR`
- `EVENT_ID_PAYLOAD_CONFLICT`
- `BUSINESS_RULE_VIOLATION`

## Compatibilidade com a API atual

O que pode ser reaproveitado:

- `AuthModule`
- `UsersModule` para bootstrap de usuarios offline
- `PgService.transaction(...)`
- `PdtConnectBootstrapService` como ponto de extensao para novas tabelas `pdtconnect`

O que ainda precisa nascer:

- `MobileSyncModule`
- DTOs de push/pull/query
- tabela `pdtconnect.mobile_event_receipt`
- processors mobile-ready por feature
- validacao explicita de escopo por loja no sync

## Decisoes recomendadas desta etapa

- manter os endpoints atuais de auth como estao
- criar um modulo novo `mobile-sync`
- fazer push por `event_id` unico com ACK granular
- fazer pull por dominio e cursor
- usar receipts para reconciliacao e replay seguro
