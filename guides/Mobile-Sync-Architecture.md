# Mobile Sync Architecture

## Objetivo

Este documento define a arquitetura recomendada de sincronizacao do novo app mobile para evitar duplicacao de processamento quando a internet cai durante a transmissao.

A proposta foi desenhada a partir do estado atual de:

- `apps/mobile`
- `apps/api`

Restricao assumida:

- esta etapa nao implementa nada
- o login atual do mobile deve ser preservado
- a proposta precisa funcionar com Expo + SQLite no mobile e NestJS na API

## Diagnostico do repositorio

### Mobile novo (`apps/mobile`)

O que ja existe hoje:

- cliente Axios central em `src/services/api.ts`
- `ENV.API_URL` ja aponta para a API com prefixo `/api`
- SQLite inicial com `app_meta`, `auth_users` e `auth_sessions`
- migrator simples em `src/database/migrations.ts`
- monitor de conectividade em `use-auth-store.ts`
- login online via `/auth/login`
- bootstrap de sessao via `/account/me`
- sync de usuarios para login offline via `/users/mobile-sync`

O que ainda nao existe:

- outbox local
- fila de transmissao
- retry com backoff
- reconciliacao de eventos apos reconnect
- armazenamento de catalogos operacionais por loja
- estado local de receipts/acks de transmissao
- qualquer modulo de sync operacional alem de usuarios

Conclusao:

- o mobile novo ja tem fundacao valida para rede, sessao, SQLite e conectividade
- a sincronizacao operacional ainda precisa nascer como um dominio novo

### API nova (`apps/api`)

O que ja existe hoje:

- API NestJS com prefixo global `/api`
- `POST /api/auth/login`
- `GET /api/account/me`
- `GET /api/users/mobile-sync`
- `PgService` para consultas/escritas no Postgres do ERP
- `PrismaService` para o banco auxiliar do sistema
- `PdtConnectBootstrapService` que hoje cria tabelas `pdtconnect.top_*`

Pontos importantes observados:

- hoje nao existe modulo de sync mobile na API
- hoje nao existe endpoint de push de eventos operacionais
- hoje nao existe endpoint de pull de dados mestres operacionais
- hoje nao existe endpoint de consulta de receipts
- hoje o bootstrap `pdtconnect` ainda nao cria nenhuma tabela de idempotencia para o mobile novo
- o modelo de permissoes no Prisma suporta `storeId`, mas o `PermissionsGuard` atual verifica so o codigo da permissao e nao o escopo por loja

Conclusao:

- a API nova ja tem autenticacao, usuario e acesso ao ERP
- ainda falta a camada de sincronizacao mobile-ready

## Problema historico a resolver

Cenario legado:

1. o mobile transmite um lote
2. a internet cai no meio da resposta
3. o backend continua processando
4. o mobile entende como erro
5. o usuario retransmite
6. o backend processa de novo e duplica o efeito

Regra de projeto para o novo fluxo:

- o `event_id` enviado pelo mobile precisa ser a chave canonica de idempotencia
- o backend precisa conseguir responder de forma deterministica mesmo apos reenvio, timeout ou reconnect

## Principios da arquitetura recomendada

- `offline-first`: toda operacao nasce localmente no SQLite antes de qualquer chamada de rede
- `event_id` unico por item: cada evento local recebe um identificador imutavel e globalmente unico
- `event_id` nao muda em retries: novas tentativas reutilizam o mesmo `event_id`
- `payload_hash` canonico: usado para detectar reuso invalido do mesmo `event_id` com payload diferente
- `ACK` granular por item: o backend responde item a item, nunca so no nivel do lote
- `batch` como unidade de transporte: o lote agrupa eventos, mas a idempotencia e por item
- `retry` automatico apenas para falhas temporarias
- `reconciliacao` obrigatoria para eventos que ficaram com resultado ambiguo
- `escopo por usuario e loja`: nada deve assumir dispositivo single-user ou single-store

## Arquitetura recomendada

### 1. Camadas no mobile

Separacao sugerida:

- `auth_*`: o que ja existe hoje para login e sessao
- `catalog_*`: dados mestres sincronizados por loja
- `op_*`: registros operacionais locais por feature
- `sync_*`: outbox, checkpoints de pull, receipts e estado do worker

Componentes recomendados no app:

- `SyncRepository`: acesso SQL ao dominio `sync_*`
- `OutboxWriter`: grava evento na outbox junto com a operacao local
- `OutboxWorker`: monta batches, envia, aplica ACK e agenda retries
- `ReconnectReconciler`: consulta receipts de eventos ambiguos apos reconnect, foreground ou bootstrap
- `MasterDataSyncService`: puxa catalogos por dominio e loja

### 2. Fluxo de escrita local

Toda acao operacional deve abrir uma transacao SQLite local com dois efeitos:

1. gravar o dado funcional da feature em `op_*`
2. gravar o evento correspondente em `sync_outbox`

Exemplo:

- o operador registra uma ruptura
- o app grava o item em `op_ruptura_items`
- na mesma transacao grava um evento `ruptura.reported` em `sync_outbox`
- a UI confirma sucesso local, mesmo sem internet

Resultado:

- a coleta nunca depende da disponibilidade imediata da API
- o app nao perde o evento se cair depois do toque do usuario

### 3. Fluxo de envio

Regras recomendadas de batch:

- um batch nao mistura usuarios diferentes
- um batch nao mistura lojas diferentes
- ordenar por `created_at`, depois `event_id`
- tamanho inicial recomendado: ate `50` eventos ou `256 KB` de payload, o que vier primeiro

Passo a passo:

1. o worker seleciona eventos aptos ao envio
2. marca os eventos como `sending`
3. atribui um `batch_id` de transporte
4. envia para o endpoint de push
5. recebe ACK granular por item
6. aplica o resultado item a item

Tratamento esperado:

- `applied` ou `duplicate`: evento vira `success`
- `rejected`: evento vira `failed` com `failure_class = permanent`
- `retry_later`: evento vira `failed` com `failure_class = temporary`
- sem resposta conclusiva: evento permanece ambiguo e entra em reconciliacao

### 4. Reconciliacao apos reconnect

Esse ponto e obrigatorio para fechar o problema historico.

Fluxo recomendado:

1. a conexao volta ou o app retorna ao foreground
2. o reconciliador busca eventos com `status = sending` que ficaram velhos
3. o app consulta o endpoint de receipts/status com os `event_id`
4. o backend responde o estado conhecido de cada item
5. o mobile fecha cada evento sem retransmitir no escuro

Se o endpoint de receipts nao responder:

- o mobile pode retransmitir o mesmo `event_id`
- a idempotencia do backend impede duplicacao

Conclusao:

- a reconciliacao reduz trafego desnecessario
- o `event_id` unico continua sendo a garantia final contra duplicacao

### 5. Idempotencia no backend

Recomendacao principal:

- manter a tabela de idempotencia/receipt no mesmo Postgres em que a regra operacional do ERP sera processada
- usar o schema `pdtconnect` para isso

Motivo:

- o problema real e exatamente o risco de a API gravar no ERP e morrer antes de responder
- se o receipt estiver na mesma transacao do ERP, a API consegue decidir com seguranca se o evento ja foi aplicado

Observacao importante do repositorio atual:

- hoje o `PdtConnectBootstrapService` ja usa `PgService`
- isso indica que o schema `pdtconnect` atual vive no mesmo Postgres acessado pelo ERP

Implicacao arquitetural:

- para idempotencia de eventos operacionais, isso e desejavel
- mover esse receipt para o banco auxiliar do Prisma antes de existir um desenho de inbox/worker cross-database enfraquece a garantia de exactly-once

Regra recomendada por evento:

1. tentar reservar o `event_id`
2. se `event_id` ja existir com o mesmo `payload_hash`, responder replay/duplicate
3. se `event_id` ja existir com hash diferente, rejeitar
4. se for novo, processar a regra do ERP e atualizar o receipt na mesma transacao

### 6. ACK granular por item

O endpoint de push deve sempre responder um ACK por evento.

Status recomendados de ACK:

- `applied`: evento processado com sucesso nesta chamada
- `duplicate`: evento ja havia sido aplicado antes com o mesmo hash
- `processing`: evento ja esta em processamento e ainda nao tem estado terminal
- `retry_later`: falha temporaria; mobile deve reagendar
- `rejected`: falha permanente; mobile nao deve reenviar automaticamente

Regra de transporte:

- para envelopes validos, a resposta deve ser `200` com `acks[]`, mesmo quando houver mistura de sucesso e erro por item
- `400`, `401`, `403`, `413` e `5xx` ficam reservados para falhas de envelope, autenticacao ou indisponibilidade antes da avaliacao item a item

### 7. Pull de dados mestres

O sync de leitura deve ser separado do push de eventos.

Motivos:

- contratos e volumetria sao diferentes
- catalogos usam cursores/checkpoints
- eventos operacionais precisam ACK por item

Modelo recomendado:

- `pull` por dominio e por loja
- cursor opaco por dominio
- resposta com `items`, `deleted_keys` e `next_cursor`

Dominios iniciais sugeridos:

- `access`
- `catalog.stores`
- `catalog.products`
- `catalog.packaging-types`
- `catalog.exchange-reasons`
- `catalog.consumption-types`
- `catalog.recipes`
- `catalog.balancos`

Observacao:

- o `GET /api/users/mobile-sync` atual pode continuar como bootstrap do login offline
- ele nao precisa ser substituido na primeira fase do sync operacional

### 8. Estados locais da outbox

Estados base pedidos para o mobile:

- `pending`
- `sending`
- `success`
- `failed`

Complemento recomendado:

- `failure_class = temporary | permanent`
- `next_attempt_at`
- `last_error_code`
- `last_error_message`

Interpretacao:

- `pending`: pronto para envio
- `sending`: lote em voo ou em reconciliacao
- `success`: ACK terminal positivo (`applied` ou `duplicate`)
- `failed` + `temporary`: volta a fila no tempo certo
- `failed` + `permanent`: para de reenviar automaticamente

### 9. Retry com backoff

Politica recomendada:

- exponential backoff com jitter
- respeitar `Retry-After` quando a API devolver
- limite inicial sugerido: `5s`, `15s`, `30s`, `60s`, `2m`, `5m`, `15m`, `30m`, `60m`

Triggers recomendados do worker:

- reconnect
- bootstrap do app
- retorno ao foreground
- timer leve enquanto online
- acao manual de "reenviar pendencias"

### 10. Compatibilidade com a estrutura atual do monorepo

### Mobile

Extensoes naturais sobre o que ja existe:

- nova migracao SQLite v2 em `src/database/migrations.ts`
- novo dominio `src/features/sync`
- novos repositorios SQL manuais, no mesmo estilo do auth atual
- reaproveitamento do `use-auth-store` para saber conectividade e sessao

### API

Modulo novo sugerido:

- `src/mobile-sync/mobile-sync.module.ts`

Subdivisao recomendada:

- `controllers/mobile-sync.controller.ts`
- `dto/push-events.dto.ts`
- `dto/pull-masters.dto.ts`
- `dto/query-receipts.dto.ts`
- `services/mobile-push.service.ts`
- `services/mobile-pull.service.ts`
- `services/mobile-receipt.service.ts`
- `processors/ruptura.processor.ts`
- `processors/balanco.processor.ts`
- `processors/consumo.processor.ts`
- `processors/troca.processor.ts`
- `processors/producao.processor.ts`

### 11. Fluxo recomendado em caso de queda de internet

Fluxo alvo:

1. mobile envia batch `B1` com eventos `E1`, `E2`, `E3`
2. API reserva/processa `E1` e `E2`
3. a internet cai antes da resposta chegar
4. mobile marca `E1`, `E2`, `E3` como ambiguos em `sending`
5. quando a rede voltar, mobile consulta receipts
6. backend responde:
   - `E1 = applied`
   - `E2 = applied`
   - `E3 = not_found` ou `retry_later`
7. mobile fecha `E1` e `E2` como `success`
8. mobile recoloca `E3` em `pending` ou `failed temporary`

Se em vez de consultar receipts o app retransmitir:

- `E1` e `E2` voltam como `duplicate`
- `E3` segue o fluxo normal

Em ambos os casos:

- nao ha duplicacao no ERP

### 12. Riscos e dependencias para a implementacao

- o mobile atual ainda trabalha com uma sessao ativa unica; a outbox precisa nascer pronta para multiplos usuarios mesmo antes da UI multiusuario existir
- o `PermissionsGuard` atual nao resolve escopo por loja; o modulo de sync deve validar `storeId` explicitamente
- o bootstrap `pdtconnect` ainda nao cria tabelas de sync/receipt
- a API ainda nao tem processors mobile-ready para `ruptura`, `balanco`, `consumo`, `troca` e `producao`
- o pull de catalogos por delta ainda depende de decidir a estrategia de cursor por dominio

## Decisoes recomendadas desta etapa

- manter `GET /api/users/mobile-sync` como bootstrap do login offline
- criar o sync operacional como um dominio novo, nao como extensao improvisada do auth
- usar `event_id` como chave canonica de idempotencia
- responder ACK granular por item
- manter receipts/idempotencia no `pdtconnect` do Postgres do ERP para garantir atomicidade com a regra de negocio
