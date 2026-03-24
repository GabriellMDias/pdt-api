# Mobile Balanco Seed Transmission Issue

## Problema encontrado

O seed local do balanco gerava itens que apareciam normalmente na lista local, mas falhavam ao transmitir com a mensagem generica:

- `A API rejeitou o lote de sincronizacao`

Ja os itens criados pelo fluxo normal da tela de balanco transmitiam sem erro.

## Causa raiz

O problema estava no envelope de sincronizacao gerado pelo seed, nao na estrutura visual da lista.

No fluxo real do balanco, a criacao usa [balanco-db.ts](../apps/mobile/src/features/balanco/data/balanco-db.ts):

- `eventId = Crypto.randomUUID()`
- `aggregateKey = balance:{balanceId}:entry:{eventId}`
- payload montado pela propria rotina
- insert em `balance_entries`
- insert em `sync_outbox_events`

No seed antigo, a criacao era feita por insercao simplificada em [dev-seed.service.ts](../apps/mobile/src/features/dev-seed/services/dev-seed.service.ts), usando:

- `eventId = dev-seed:balanco:{uuid}`

Isso quebrava a validacao da API no DTO [push-mobile-sync-events.dto.ts](../apps/api/src/mobile-sync/dto/push-mobile-sync-events.dto.ts), porque `eventId` precisa ser UUID:

- `@IsUUID() eventId: string`

Ou seja, o lote seedado era rejeitado antes mesmo de chegar no `BalanceItemRecordedProcessor`.

## Diferenca entre item manual e item seedado

Item manual:

- `event_id` em UUID puro
- payload criado pela rotina real
- `aggregate_key` coerente com o UUID real
- `payload_hash` calculado sobre envelope valido

Item seedado antigo:

- `event_id` com prefixo textual `dev-seed:balanco:...`
- payload muito parecido com o real
- `aggregate_key` derivado desse `event_id` invalido
- envelope rejeitado pela validacao HTTP 400 da API

Em outras palavras, o conteudo de negocio estava essencialmente correto, mas o identificador do evento nao obedecia ao contrato da sync.

## Como o seed foi corrigido

Foram feitos dois ajustes principais:

1. O seed passou a usar `eventId` valido em UUID.
2. O seed de balanco passou a reutilizar a propria criacao real da rotina:
   - [createLocalBalancoEntry](../apps/mobile/src/features/balanco/data/balanco-db.ts)

Assim, o seed agora reproduz o mesmo fluxo local do operador para:

- validacao da quantidade
- geracao do payload
- geracao do `aggregateKey`
- gravacao em `balance_entries`
- gravacao em `sync_outbox_events`

Como o `eventId` nao pode mais carregar o prefixo `dev-seed`, a identificacao para limpeza de seed passou a ficar registrada em `app_meta` por rotina/usuario/loja. A limpeza continua dev-only e ainda remove tambem seeds antigos que usavam o prefixo legado.

## Diagnostico em desenvolvimento

Tambem foi melhorado o diagnostico do push no mobile em ambiente de desenvolvimento:

- o app agora extrai mensagens detalhadas de erro da API, inclusive arrays de validacao
- em dev, quando um lote e rejeitado, o console mostra:
  - scope da sync
  - filtros usados
  - eventos enviados
  - resposta real da API

Isso fica em [mobile-sync-service.ts](../apps/mobile/src/features/mobile-sync/services/mobile-sync-service.ts).

## Como validar manualmente

1. Sincronize a loja para garantir que existam balancos e catalogo local.
2. Gere seed de balanco pela tela de debug em desenvolvimento.
3. Abra a rotina de balanco e confirme que os itens aparecem localmente.
4. Dispare a transmissao do balanco seedado.
5. Confirme que:
   - nao aparece mais a rejeicao generica por lote invalido
   - os itens passam para `processed` ou `duplicate`
   - a tela deixa de mostrar os itens como pendentes
6. Se houver nova falha, confira o console do app em desenvolvimento:
   - o payload enviado estara logado
   - a resposta real da API tambem

## Observacao importante

O problema nao era um campo de negocio faltando em `balance_entries`. O erro estava no contrato do envelope de sincronizacao, especificamente no `eventId` invalido gerado pelo seed simplificado.
