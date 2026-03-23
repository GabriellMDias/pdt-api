# Mobile Sync Backend

## Objetivo

Este documento registra a fundacao implementada no `apps/api` para sincronizacao mobile com idempotencia por `event_id`.

Escopo desta etapa:

- endpoint generico de push de eventos
- receipts persistidos no Postgres `pdtconnect`
- ACK granular por item
- diferenciacao entre erro temporario e permanente
- extensao futura por processors de negocio

Fora de escopo nesta etapa:

- features operacionais especificas como quebra, balanco ou producao
- pull de catalogos mestres
- endpoint de consulta de receipts

## Modulo implementado

Local:

- `apps/api/src/mobile-sync`

Componentes criados:

- `mobile-sync.module.ts`
- `mobile-sync.controller.ts`
- `mobile-sync.service.ts`
- `mobile-sync.receipts.repository.ts`
- `mobile-sync.processor.registry.ts`
- `processors/noop-mobile-sync.processor.ts`
- DTOs e entities de contrato HTTP
- testes unitarios e de controller

Integracao no app:

- `MobileSyncModule` foi registrado em `AppModule`
- o schema `pdtconnect` agora garante a tabela `mobile_event_receipts`

## Endpoint implementado

Rota:

- `POST /api/mobile-sync/events/push`

Autenticacao:

- protegida por `JwtAuthGuard`

Objetivo:

- receber um lote de eventos offline-first do mobile
- aplicar idempotencia por `event_id`
- devolver um ACK por evento, sem acoplar a uma feature operacional especifica

Payload esperado:

```json
{
  "events": [
    {
      "eventId": "6d35fc53-c87e-4766-b3f6-70d43f112f8c",
      "eventType": "mobile.noop",
      "aggregateType": "inventory",
      "aggregateKey": "inventory:store:1",
      "storeId": 1,
      "deviceId": "device-android-01",
      "schemaVersion": 1,
      "payload": {
        "message": "hello"
      }
    }
  ]
}
```

Regras de validacao:

- `eventId` deve ser UUID valido
- `eventType` obrigatorio e com ate `120` caracteres
- `schemaVersion` obrigatorio e maior ou igual a `1`
- `payload` deve ser objeto JSON
- `events` deve ter pelo menos um item

## Tabela de receipts / idempotencia

Tabela:

- `pdtconnect.mobile_event_receipts`

Papel:

- registrar a primeira recepcao de cada `event_id`
- guardar o hash canonico do payload recebido
- armazenar o estado terminal ou temporario do processamento
- permitir replay seguro sem duplicar processamento de negocio

Colunas principais:

- `receipt_id`: identificador interno do receipt
- `event_id`: chave unica de idempotencia
- `event_type`: tipo logico do evento
- `aggregate_type`: agregado funcional opcional
- `aggregate_key`: chave funcional opcional
- `store_id`: escopo opcional de loja
- `user_id`: usuario autenticado que enviou o evento
- `device_id`: identificador opcional do dispositivo
- `schema_version`: versao do contrato do evento
- `payload_hash`: hash SHA-256 canonico do envelope
- `request_payload_json`: payload bruto recebido
- `response_payload_json`: resposta do processor quando houver sucesso
- `status`: `processing`, `processed`, `temporary_error`, `permanent_error`
- `error_code` e `error_message`: motivo funcional ou tecnico de falha
- `processed_at`, `created_at`, `updated_at`: trilha temporal

Indices:

- `uq_mobile_event_receipts_event_id`
- `idx_mobile_event_receipts_status`
- `idx_mobile_event_receipts_user_store`

## Fluxo de idempotencia implementado

Para cada item do lote:

1. a API calcula um `payload_hash` canonico do evento
2. abre uma transacao no `PgService`
3. procura receipt existente por `event_id` com lock de linha
4. se nao existir, cria um receipt em `processing`
5. despacha o evento para um processor registrado para o `eventType`
6. em sucesso, atualiza o receipt para `processed`
7. em erro de negocio, atualiza o receipt para `permanent_error`
8. em erro temporario, atualiza o receipt para `temporary_error`

Reenvio do mesmo `event_id`:

- mesmo hash + status `processed`: responde `duplicate`
- mesmo hash + status `permanent_error`: reapresenta a falha permanente
- mesmo hash + status `processing`: responde `temporary_error` com `event_in_progress`
- mesmo hash + status `temporary_error`: reprocessa o evento
- hash diferente: responde `permanent_error` com `event_id_payload_mismatch`

Protecao adicional de concorrencia:

- existe indice unico por `event_id`
- se dois requests chegarem quase juntos, a segunda tentativa cai no fluxo de replay em vez de duplicar o negocio
- a leitura com `FOR UPDATE` evita dois retries concorrentes sobre o mesmo receipt temporario

## Contrato de ACK

Resposta por item:

- `processed`: evento processado nesta chamada
- `duplicate`: evento ja havia sido aplicado antes
- `temporary_error`: falha temporaria, pode reenviar
- `permanent_error`: falha terminal, nao deve reenviar automaticamente

Campos de ACK:

- `eventId`
- `status`
- `receiptId`
- `processedAt`
- `errorCode`
- `errorMessage`
- `retryable`

Resumo agregado:

- `processed`
- `duplicates`
- `temporaryErrors`
- `permanentErrors`

Regra de transporte:

- payload valido retorna `200` com ACK por item, inclusive em lotes mistos
- `400` fica reservado para envelope invalido antes do processamento item a item

## Erros temporarios vs permanentes

Erros permanentes:

- payload semanticamente invalido para a regra
- `event_id` reutilizado com payload diferente
- `eventType` sem processor registrado
- qualquer rejeicao funcional explicitamente modelada como `MobileSyncPermanentError`

Erros temporarios:

- indisponibilidade transitória de dependencia
- lock, timeout ou falha recuperavel de infraestrutura
- qualquer erro explicitamente modelado como `MobileSyncTemporaryError`
- excecao nao classificada durante o processamento, tratada como `temporary_processing_error`

Regra pratica:

- somente `temporary_error` volta para retry automatico no mobile
- `permanent_error` precisa de correcao de dado ou de fluxo antes de novo envio

## Extensao por processors

A fundacao foi desenhada para nao depender de uma feature unica.

Padrao adotado:

- `MobileSyncProcessorRegistry` resolve o processor pelo `eventType`
- cada processor implementa `canHandle()` e `process()`
- o processor recebe `event`, `user`, `client`, `receiptId` e `receivedAt`

Processor inicial:

- `NoopMobileSyncProcessor`, para `eventType = mobile.noop`

Como evoluir:

- adicionar novos processors por dominio operacional
- registrar os processors no modulo
- manter a idempotencia e o receipt genericos, sem criar um endpoint por feature

## Testes implementados

Cobertura adicionada:

- primeiro envio processa normalmente
- reenvio do mesmo `event_id` retorna `duplicate`
- payload invalido retorna `400`
- erro de regra de negocio retorna `permanent_error`
- receipt em `processing` retorna `temporary_error`

Arquivos:

- `apps/api/src/mobile-sync/mobile-sync.service.spec.ts`
- `apps/api/src/mobile-sync/mobile-sync.controller.spec.ts`

## Riscos e proximos passos

Riscos pendentes:

- ainda nao existe processor real de negocio para ruptura, balanco, consumo, troca ou producao
- a tabela de receipts ainda nao expira dados historicos nem tem politica de arquivamento
- o modulo ainda nao valida escopo de permissao por loja alem do usuario autenticado

Proximos passos recomendados:

1. criar processors reais para a primeira feature operacional
2. adicionar endpoint de consulta de receipts para reconciliacao do mobile
3. adicionar endpoint de pull de catalogos mestres por dominio
4. evoluir observabilidade com metricas de duplicate, retry e erro permanente
