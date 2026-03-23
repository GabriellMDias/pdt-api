# Mobile Consumo Implementacao

## O que foi reaproveitado da troca

- shell principal de transmissao com `TransmissionHeader`, `FlatList` e `FAB`
- fluxo de entrada por modal de motivo
- coleta com `Quantidade`, `Embalagem`, `Total`, resumo do produto e `Adicionar / Remover`
- validacao local para impedir remocao maior que o saldo pendente
- transmissao manual/automatica pela mesma infraestrutura de outbox

## O que foi reaproveitado da ruptura

- fluxo de scanner apoiado em `use-product-scan-store`
- feedback sonoro operacional
- swipe para excluir
- badge/status visual de transmissao

## O que foi compartilhado entre as rotinas

Extracoes novas:

- `apps/mobile/src/features/shared/stock-movement/components/movement-reason-modal.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-type-toggle.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-metric-field.tsx`
- `apps/mobile/src/features/shared/stock-movement/components/movement-list-item.tsx`
- `apps/mobile/src/features/shared/stock-movement/utils.ts`

Ja compartilhado antes e reutilizado:

- `shared/products/*`
- `shared/operational-entry/*`
- `shared/services/operational-feedback.service.ts`
- `flushPendingSyncOutbox`
- `currentStoreId` e `autoTransmitEnabled` em `useAuthStore`

## O que ficou especifico do consumo

- tabela local `consumption_reasons`
- tabela local `consumption_entries`
- repositores `consumption-reasons.repository.ts` e `consumo.repository.ts`
- dominio mobile `consumo-db.ts`
- telas `consumo-screen.tsx`, `consumo-collect-screen.tsx` e `consumo-barcode-scanner-screen.tsx`
- catalogo mobile `consumption.reasons`
- backend `ConsumoService`, `ConsumoModule` e `ConsumptionItemRecordedProcessor`

## Como a rotina antiga foi adaptada

Fidelidades ao legado:

- lista principal de lancamentos
- modal inicial para escolher `tipo de consumo`
- coleta com produto, quantidade, embalagem, total e toggle de movimento
- transmissao e exclusao de lancamentos
- scanner por camera na etapa de produto

Adaptacoes para a arquitetura nova:

- sem `logconsumo.transmitido`; o status vem da outbox
- sem POST agregado por lote fragil; cada item vira evento idempotente
- loja atual vem do sync global
- `tipoconsumo` entra pela mesma infraestrutura de catalog pull do app

## Limitacoes e proximos refinamentos

- o backend de consumo implementado cobre o fluxo operacional principal, mas nao porta toda a complexidade antiga de estoque associado e congelamento
- consumo e troca ainda tem telas de coleta irmas; a infraestrutura compartilhada foi extraida, mas ainda existe espaco para um refactor futuro de composicao sem pressa
- falta validacao visual em aparelho real Android para densidade fina da coleta e do scanner
