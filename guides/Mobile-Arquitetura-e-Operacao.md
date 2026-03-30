# Mobile: Arquitetura e Operacao

## Objetivo atual

`apps/mobile` e o cliente mobile operacional do monorepo. Ele deve funcionar em modo `offline-first`, usar SQLite local com migrations manuais e consumir apenas `apps/api`.

## Estado canonico atual

Hoje o app novo ja entrega:

- autenticacao online/offline e bootstrap local de sessao
- sincronizacao de conta, lojas e permissoes
- catalogos locais por loja e por dominio operacional
- captura local e transmissao para `ruptura`, `troca`, `consumo`, `producao` e `balanco`
- home nova com favoritos, configuracoes do usuario, update do app e utilitarios de suporte/dev

Itens ainda nao migrados aparecem como placeholder na home. Eles devem ser tratados como backlog de produto, nao como documentacao paralela em `guides/`.

## Relacao entre mobile, API e web

- `apps/mobile`: coleta operacional, armazenamento local, sync e experiencia offline.
- `apps/api`: unica integracao de backend do mobile. Expoe autenticacao, bootstrap, catalogos mobile, ingestao de eventos e endpoints de update.
- `apps/web`: superficie administrativa. Publica APKs, consulta logs de transmissao e apoia a operacao do mobile, sem substituir a logica offline do app.

## Principios canonicos

- Consumir exclusivamente `apps/api`. Nao usar `apps/mobile_old/mobile_backend`.
- Preservar o comportamento funcional ja consolidado no app novo e no legado quando ele ainda for valido.
- Tratar `apps/mobile_old` como referencia funcional, nao como referencia arquitetural.
- Manter a persistencia local em SQLite com migrations incrementais e manuais.
- Centralizar transmissao em outbox compartilhada, sem replicar logica de transporte tela a tela.
- Evitar mudancas invasivas no banco do VRMaster.
- Preferir o PostgreSQL auxiliar `pdtconnect` para recibos, logs, idempotencia, metadados e estruturas auxiliares de suporte.

## Persistencia local no mobile

O banco SQLite local concentra:

- `app_meta` e tabelas `auth_*` para sessao e bootstrap basico
- snapshot local de conta, lojas e permissoes
- `sync_outbox_events` para eventos pendentes de transmissao
- `sync_runs` para rastrear execucoes de pull/push e metricas
- tabelas de catalogo e tabelas operacionais por rotina

Mudancas de schema entram como novas migrations em `apps/mobile/src/database/migrations`. Nao reescreva migrations antigas; evolua por adicao.

## Modelo canonico de sync

### Pull de bootstrap e catalogos

- `runInitialSync` prepara conta, lojas e permissoes do usuario.
- `runGlobalSync` sincroniza os catalogos por loja e salva a loja corrente do usuario.
- Os dominios de catalogo suportados hoje passam por `POST /mobile-sync/catalog/pull`.

Dominios atuais:

- `stock.products`
- `rupture.products`
- `exchange.reasons`
- `consumption.reasons`
- `production.recipes`
- `balance.headers`

### Push operacional via outbox

- Cada rotina persiste primeiro no SQLite local.
- Depois disso, ela registra um evento em `sync_outbox_events`.
- `flushPendingSyncOutbox` envia lotes para `POST /mobile-sync/events/push`.
- O resultado do envio atualiza a outbox local e registra execucoes em `sync_runs`.

Essa e a decisao canonica: telas operacionais nao devem falar diretamente com endpoints de escrita sem passar pelo modelo local + outbox.

### Idempotencia e recibos

A API registra os eventos recebidos em `pdtconnect.mobile_event_receipts`.

Regras atuais:

- `event_id` identifica o evento de forma unica
- `payload_hash` protege contra reuso do mesmo `event_id` com payload diferente
- evento ja processado retorna ACK de duplicidade
- evento em processamento retorna erro temporario e retryable
- evento invalido ou inconsistente retorna erro permanente

Essa rastreabilidade fica no auxiliar PostgreSQL, nao no VRMaster.

## Reaproveitamento entre rotinas

As rotinas atuais ja compartilham blocos importantes. Antes de criar novas variantes, reutilize:

- `src/features/shared/products`: catalogo, busca e leitura de codigo
- `src/features/shared/stock-movement`: metricas, tipos de movimento e validacoes
- `src/features/shared/operational-entry`: shells, badges, cabecalhos e seletores
- `src/features/shared/operational-export`: exportacao TXT e saidas operacionais
- `src/features/shared/services/operational-feedback.service`: feedback sonoro, visual e UX operacional

A regra pratica e: nova rotina deve entrar primeiro nas camadas compartilhadas; especializacoes por feature so aparecem quando o comportamento realmente diverge.

## Modulos operacionais atuais

- `ruptura`: coleta local + transmissao de eventos de ruptura
- `troca`: coleta local + transmissao de itens de troca
- `consumo`: coleta local + transmissao de itens de consumo
- `producao`: coleta local + transmissao de itens de producao
- `balanco`: selecao de balanco, coleta local e transmissao de itens agrupados

Todos esses modulos ja fazem parte do estado atual do app. Documentacao antiga que descreve essas rotinas como "nao migradas" esta superada.

## Papel do legado

Use o legado para:

- conferir comportamento funcional esperado
- revisar validacoes, nomenclatura operacional e ordem de uso das telas
- comparar payloads e efeitos de negocio quando houver duvida

Nao use o legado para:

- ditar a arquitetura de sync
- reintroduzir integracao com `mobile_backend`
- copiar acoplamentos antigos de persistencia ou transporte
- justificar duplicacao de componentes que hoje ja existem em `src/features/shared`

## Diretrizes para continuar o desenvolvimento

- Preserve o fluxo `local first`, com escrita local antes de transmissao.
- Adicione novas tabelas e ajustes locais por migration incremental.
- Reuse a outbox compartilhada e crie novos `eventType` e processors em vez de fluxos paralelos.
- Se uma nova rotina precisar de catalogo, inclua o dominio no pull canonico da API e no sync do app.
- Prefira estruturas auxiliares em `pdtconnect` para logs, recibos, checkpoints e idempotencia.
- Mantenha alinhamento com permissoes e escopo de loja vindos do bootstrap.
- Atualize este guia quando a arquitetura mudar; nao reabra diarios de migracao em arquivos separados.

## Documentacao relacionada

- [Identidade-Visual-Mobile.md](./Identidade-Visual-Mobile.md)
- [versionamento.md](./versionamento.md)
