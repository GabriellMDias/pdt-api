# Web Logs de Transmissao

## Onde a tela foi criada

- Web: `apps/web/src/pages/configuracoes/mobile-sync-logs/MobileSyncLogsPage.tsx`
- Modal de detalhes: `apps/web/src/pages/configuracoes/mobile-sync-logs/TransmissionLogDetailsModal.tsx`
- Rota: `/configuracoes/mobile/logs`
- API: `GET /api/mobile-sync/logs`
- API de apoio para filtro de usuario: `GET /api/mobile-sync/logs/users`

## Filtros disponiveis

- periodo inicial e final
- usuario
- tipo da rotina
- loja

Os filtros ficam em um card no topo da tela e seguem o mesmo padrao operacional das demais telas administrativas.

## Endpoint e backend utilizados

O backend consulta a tabela `pdtconnect.mobile_event_receipts`, onde a API ja registra o recebimento e o processamento dos eventos de sync do mobile.

Campos usados no retorno:

- `receipt_id`
- `event_id`
- `event_type`
- `aggregate_type`
- `aggregate_key`
- `store_id`
- `user_id`
- `device_id`
- `status`
- `error_code`
- `error_message`
- `request_payload_json`
- `response_payload_json`
- `processed_at`
- `created_at`
- `updated_at`

Complementos montados no backend:

- nome e email do usuario
- descricao da loja
- tipo/rotulo da rotina
- resumo operacional
- duracao aproximada do processamento

## Componentes reutilizados

A tela foi montada em cima da infraestrutura ja existente do web:

- `Layout`
- `PermissionGate`
- `DateRange`
- `DefaultSelect`
- `DefaultButton`
- `StoreMultiSelect`
- `TableCard`
- `SimpleTable`
- `PaginationBar`
- `Tag`

## Campos exibidos na listagem

Tabela principal:

- data/hora
- usuario
- tipo
- loja
- status
- resumo da transmissao
- acao de detalhes

## Como os detalhes sao mostrados

Os detalhes ficam em um modal proprio da pagina, com:

- resumo operacional
- identificadores tecnicos (`receiptId`, `eventId`, `aggregateKey`)
- timestamps
- payload enviado
- resposta/metadados retornados pela API
- erro codigo/mensagem, quando houver

## Permissoes

A tela usa a permissao `mobile-sync-logs:consultar`.

Ela foi criada com `useStorePermission = true`, entao:

- o usuario pode consultar apenas as lojas permitidas
- o filtro de lojas no web respeita essa permissao
- o backend reforca a mesma restricao

## Limitacoes atuais

- a estrutura atual registra logs por evento individual, nao por lote completo do push
- por isso a tela mostra muito bem o historico por item/evento, mas nao possui um `batchSize` real do lote enviado
- quando isso nao existe na modelagem, a tela nao inventa o dado

## Melhorias futuras possiveis

- filtro adicional por status
- exportacao da listagem
- agrupamento por `aggregate_key`
- resumo consolidado por periodo/rotina/loja
