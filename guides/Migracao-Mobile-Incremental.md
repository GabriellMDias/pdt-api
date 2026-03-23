# Guia de Migracao Mobile Incremental

## Objetivo
Este guia registra o estado atual da migracao do app mobile legado para a nova arquitetura do monorepo e define uma trilha incremental de entrega.

Premissas obrigatorias desta migracao:
- `apps/mobile` deve consumir `apps/api`, nunca `apps/mobile_old/mobile_backend`.
- O app novo deve ser `offline-first`.
- O banco local do mobile deve continuar em SQLite com SQL manual + migrator.
- O login ja implementado no app novo deve ser preservado, salvo erro real.
- Mudancas no banco do VRMaster devem ser evitadas; o banco auxiliar `pdtconnect` deve absorver suporte de sincronizacao, idempotencia e metadados.

## Estado Atual Mapeado

### 1. Mobile novo (`apps/mobile`)
Ja existe uma fundacao valida para autenticacao:
- login online via `/auth/login`
- bootstrap de sessao com token JWT
- cache local de usuarios para login offline
- sincronizacao de usuarios via `/users/mobile-sync`
- SQLite inicial com `app_meta`, `auth_users` e `auth_sessions`
- tema inicial alinhado ao guia visual em `guides/Identidade-Visual-Mobile.md`

Arquivos-chave:
- `src/features/auth/store/use-auth-store.ts`
- `src/features/auth/data/auth-db.ts`
- `src/database/migrations.ts`
- `src/features/auth/components/login-screen.tsx`
- `src/features/auth/components/home-screen.tsx`

Conclusao:
- a base de login deve ser mantida
- ainda nao existem catalogos offline por loja
- ainda nao existe fila de transmissao unificada
- ainda nao existem modulos migrados de operacao (`ruptura`, `balanco`, `consumo`, `producao`, `troca`)

### 2. API nova (`apps/api`)
Ja existem endpoints e modulos uteis para a migracao:
- autenticacao via `POST /auth/login`
- conta atual via `GET /account/me`
- sincronizacao de usuarios via `GET /users/mobile-sync`
- dominio administrativo de ruptura via `POST /ruptura/atualizar-prateleira`

Observacoes importantes:
- o endpoint atual de ruptura nao substitui o fluxo antigo de coleta mobile; ele apenas aplica no cadastro de produtos os dados ja gravados em `rupturacoletor`
- o bootstrap atual do schema `pdtconnect` prepara tabelas de TOP, mas ainda nao cria tabela de idempotencia para transmissao mobile
- hoje nao existe conjunto de endpoints mobile-ready para sincronizar catalogos operacionais do legado

### 3. Legado (`apps/mobile_old`)
O legado ainda e a principal fonte de regra funcional para o mobile operacional.

Rotinas efetivamente implementadas no frontend antigo:
- `Ruptura`
- `Balanco`
- `Consumo`
- `Producao`
- `Troca`

Catalogos sincronizados pelo backend antigo:
- lojas
- tipo de embalagem
- produtos
- receitas
- motivos de troca
- tipos de consumo
- balancos

## Inventario do Legado e Reaproveitamento

### Reaproveitar como regra de negocio ou referencia forte

#### Login e sessao do mobile novo
Recomendacao:
- manter como esta e evoluir por extensao

Motivo:
- ja atende autenticacao online/offline
- ja persiste usuarios localmente
- ja usa SQLite com migrator
- ja esta alinhado com a diretriz de preservar o que foi feito

#### Comportamento do `ProductInput`
Origem:
- `apps/mobile_old/mobile_front/components/ProductInput.tsx`

Reaproveitar:
- busca por codigo de barras, codigo interno e descricao
- leitura de codigo pesado
- fluxo de camera + selecao + beep de sucesso/erro

Observacao:
- o comportamento deve ser reaproveitado; o componente em si deve ser refeito com a identidade do app novo

#### Padrao de transmissao do balanco
Origem:
- `apps/mobile_old/mobile_front/app/estoque/balanco/transmissionScreen.tsx`
- `apps/mobile_old/mobile_front/utils/idempotency.ts`
- `apps/mobile_old/mobile_backend/src/lib/idempotency.ts`

Reaproveitar:
- agregacao local antes do envio
- ordenacao estavel do payload
- chunking
- chave de idempotencia derivada do conteudo
- marcacao local apenas dos itens efetivamente aceitos pelo backend

Motivo:
- e o fluxo mais maduro do legado para garantir resiliencia sem duplicar processamento

#### Padrao geral de consolidacao antes da transmissao
Origem:
- telas antigas de `consumo`, `troca`, `producao`, `ruptura`

Reaproveitar:
- consolidar itens equivalentes antes do envio
- manter rastreabilidade local do que foi coletado
- separar itens pendentes de itens transmitidos

Motivo:
- reduz volume enviado e aproxima o payload do efeito real esperado no ERP

#### Lista de transmissao, feedback e operacao offline
Origem:
- `TransmissionList`
- `LastSync`
- `ModalMessage`
- `ExportTxtData`

Reaproveitar:
- padrao de feedback operacional
- visualizacao de pendencias
- informacao de ultima sincronizacao

Observacao:
- reaproveitamento de UX e comportamento, nao copia literal dos componentes

#### Catalogos e tabelas funcionais do legado
Origem:
- migrations antigas do frontend legado

Reaproveitar como referencia:
- `produto`
- `tipoembalagem`
- `tipomotivotroca`
- `tipoconsumo`
- `receita`
- `balanco`
- logs locais por rotina

Motivo:
- mostram quais dados precisam estar offline para cada tela funcionar

### Nao portar literalmente

#### Backend antigo em Express
Nao reutilizar como base arquitetural:
- escreve direto no ERP
- mistura regra de negocio, SQL e transporte
- tem interpolacao de SQL em varios pontos
- repete padroes por endpoint

O que vale reaproveitar:
- somente regras e contratos funcionais

#### `conprops` e configuracao manual por IP/porta
Nao portar:
- dependencia de IP interno/externo
- porta manual
- single-store em estado global

Substituir por:
- configuracao via `ENV.API_URL`
- selecao de loja e escopo local por usuario

#### Hardcodes operacionais
Nao portar:
- `idUser = 66`
- `ipTerminal` fixo
- datas e comportamento acoplados ao dispositivo

Substituir por:
- usuario autenticado real
- identificacao local de dispositivo
- timestamps gerados de forma consistente no app

#### Estrutura de migracoes do legado
Nao portar literalmente:
- existe inconsistencia de numeracao
- `migrations/index.ts` para na versao 4
- existem arquivos adicionais com numeracao 5 fora da sequencia efetiva

Conclusao:
- o esquema antigo serve como referencia funcional, nao como migracao fonte

## Gaps Reais da Arquitetura Atual

### No mobile novo
- nao existe modelo de catalogo offline por loja
- nao existe selecao de loja vinculada ao usuario logado
- nao existe fila de outbox com retry e backoff
- nao existe modelo local para `ruptura`, `balanco`, `consumo`, `producao` e `troca`
- nao existe componente equivalente ao `ProductInput`

### Na API nova
- nao existem endpoints de sincronizacao de catalogos operacionais para o mobile
- nao existem endpoints transacionais equivalentes aos envios do legado
- nao existe tabela `pdtconnect.api_idempotency` criada pelo bootstrap atual
- o endpoint de ruptura existente nao e o endpoint de ingestao mobile

### No modelo de sincronizacao
- `syncVersion` de usuarios esta fixo em `1`
- o payload de usuarios ainda nao modela sincronizacao incremental por loja
- o mobile novo ainda nao possui `cursor`, `etag`, `updatedAt` real por dominio sincronizado

## Arquitetura Alvo Recomendada

### 1. Preservar o dominio de autenticacao atual
Manter:
- `auth_users`
- `auth_sessions`
- `app_meta`

Evoluir por extensao:
- metadados de loja selecionada por usuario
- cache de permissoes por escopo
- versoes de sincronizacao por dominio

### 2. Criar dominios locais separados
Separacao recomendada no SQLite:
- `auth_*` para autenticacao e sessao
- `catalog_*` para dados sincronizados por loja
- `op_*` para coletas/lancamentos locais
- `sync_*` para fila, tentativas e checkpoints

Exemplo minimo de tabelas novas:
- `catalog_stores`
- `catalog_products`
- `catalog_packaging_types`
- `catalog_consumption_types`
- `catalog_exchange_types`
- `catalog_recipes`
- `catalog_balancos`
- `user_store_access`
- `op_ruptura_items`
- `op_balanco_items`
- `op_consumo_items`
- `op_producao_items`
- `op_troca_items`
- `sync_outbox`
- `sync_state`

### 3. Centralizar transmissao em uma outbox unica
Em vez de repetir a logica em cada tela, a recomendacao e uma fila unica com campos como:
- `id`
- `operation_type`
- `dedupe_key`
- `payload_json`
- `payload_hash`
- `status`
- `attempt_count`
- `next_attempt_at`
- `last_error`
- `user_id`
- `store_id`
- `created_at`
- `updated_at`

Beneficios:
- retry padronizado
- backoff centralizado
- idempotencia uniforme
- observabilidade do que esta pendente

### 4. Idempotencia no banco auxiliar
Recomendacao:
- criar suporte de idempotencia no schema `pdtconnect`
- nao depender de alteracoes invasivas no VRMaster

Tabela esperada no auxiliar:
- `pdtconnect.api_idempotency`

Uso:
- chave unica por endpoint + `dedupe_key`
- hash do payload
- replay de resposta concluida
- retorno `202` quando processamento anterior ainda estiver em andamento
- retorno `409` quando mesma chave for reutilizada com payload diferente

### 5. Sincronizacao por dominios e por loja
Nao repetir o modelo do legado que apaga e baixa tudo a cada sincronizacao.

Preferir:
- sincronizacao por dominio
- checkpoint por loja
- possibilidade futura de delta sync
- invalidez local controlada por `updatedAt`, versao ou cursor

### 6. Identidade visual
Continuar alinhando o app novo ao guia:
- dark mode como padrao inicial
- tokens de cor centralizados
- linguagem visual proxima do `apps/web`
- componentes base reutilizaveis antes de migrar modulos operacionais

## Ordem Recomendada de Entrega

### Fase 0 - Diagnostico e alinhamento
Escopo:
- revisar legado
- documentar reaproveitamento
- preservar login atual
- mapear gaps da API e do app

Checklist de aceitacao:
- legado revisado
- login atual mantido
- modulos alvo identificados
- riscos arquiteturais registrados

### Fase 1 - Fundacao offline por loja
Escopo:
- modelar tabelas `catalog_*`, `op_*` e `sync_*`
- criar migracao SQLite v2
- armazenar loja selecionada e escopo por usuario
- criar endpoints da API para sincronizacao de catalogos operacionais

Checklist de aceitacao:
- usuario autenticado consegue selecionar loja permitida
- catalogos da loja ficam disponiveis offline
- sincronizacao nao apaga dados operacionais locais
- versoes/checkpoints ficam registrados

### Fase 2 - Outbox e idempotencia
Escopo:
- implementar `sync_outbox`
- adicionar executor com retry/backoff
- criar tabela de idempotencia no banco auxiliar
- padronizar contrato de resposta dos endpoints mobile

Checklist de aceitacao:
- perda de internet nao duplica processamento
- reenvio apos timeout nao gera lancamento duplicado
- itens confirmados sao marcados localmente
- falhas ficam observaveis para novo processamento

### Fase 3 - Primeira feature migrada
Recomendacao:
- migrar uma rotina operacional completa usando a nova fundacao

Prioridade sugerida:
- `Ruptura` se a meta for validar o menor payload e fechar um primeiro fluxo vertical
- `Balanco` se a meta for validar o caso mais forte de idempotencia e servir de molde para as demais rotinas

Minha recomendacao pratica:
- concluir primeiro a fundacao de catalogos + outbox
- depois escolher `Ruptura` como primeiro corte vertical menor
- usar `Balanco` como segunda entrega para consolidar o contrato de idempotencia

### Fase 4 - Migracao das demais rotinas
Ordem sugerida:
- `Consumo`
- `Troca`
- `Producao`
- `Balanco` ou `Ruptura`, dependendo da decisao da fase anterior

## Validacao por Etapa

### Validacao tecnica
- migracoes SQLite executam em instalacao limpa e base existente
- login online e offline continuam funcionando
- mudanca de usuario nao corrompe catalogos nem pendencias
- troca de loja respeita escopo local
- fila reprocessa sem duplicar efeito no backend

### Validacao funcional
- operacao pode ser registrada sem internet
- usuario visualiza o que esta pendente
- transmissao parcial nao perde itens nao confirmados
- permissoes continuam sendo respeitadas

### Validacao de arquitetura
- nenhuma rotina nova depende do backend legado
- nenhuma mudanca invasiva e feita no VRMaster sem necessidade real
- metadados operacionais e de sincronizacao ficam no auxiliar `pdtconnect` ou no SQLite local

## Riscos Pendentes
- ausencia atual de endpoints mobile-ready na API pode travar a migracao das telas se a fundacao nao vier primeiro
- falta atual de idempotencia no `apps/api` para rotinas mobile e um risco direto de duplicidade
- o modelo atual de sync de usuarios ainda nao cobre sincronizacao incremental por loja
- o legado contem SQL e fluxos com acoplamento alto ao ERP; portar sem refino aumentaria a divida tecnica
- `apps/mobile_old` aparece hoje como nao rastreado no git e deve ser tratado com cuidado para nao virar fonte de conflito operacional

## Decisao desta etapa
Antes de qualquer feature nova:
- manter o login atual
- usar o legado como referencia funcional
- migrar por fundacao + fila + primeira feature
- concentrar persistencia auxiliar e idempotencia no schema `pdtconnect`
*** Delete File: c:\Users\Gabriel\Workspace\pdt-api\apps\mobile\README.md
*** Add File: c:\Users\Gabriel\Workspace\pdt-api\apps\mobile\README.md
# PDT Connect Mobile

Aplicativo mobile novo do projeto, em Expo SDK 54, destinado a substituir o legado operacional que hoje vive em `apps/mobile_old/mobile_front`.

## Principios do projeto
- consumir exclusivamente a API principal em `apps/api`
- funcionar em modo `offline-first`
- usar SQLite local com SQL manual + migrator
- preservar o login novo ja implementado, salvo erro real
- manter paridade visual com `apps/web` seguindo `guides/Identidade-Visual-Mobile.md`
- evitar mudancas invasivas no banco do VRMaster

## Estado atual
O app novo ja entrega a fundacao de autenticacao:
- login online via API principal
- bootstrap de sessao local
- sincronizacao de usuarios para login offline
- armazenamento local de usuarios e sessao em SQLite
- tema inicial alinhado aos tokens visuais do projeto

Ainda nao foram migradas para o app novo as rotinas operacionais do legado:
- ruptura
- balanco
- consumo
- producao
- troca

## Estrutura principal
- `app/`: rotas do Expo Router
- `src/database/`: acesso ao SQLite e migracoes
- `src/features/auth/`: fluxo de login, sincronizacao de usuarios e sessao offline
- `src/theme/`: tokens visuais compartilhados no app
- `src/services/`: cliente HTTP da API

## Documentacao relacionada
- `guides/Identidade-Visual-Mobile.md`
- `guides/Migracao-Mobile-Incremental.md`

## Fluxo de trabalho recomendado
1. Revisar o legado antes de iniciar qualquer nova feature mobile.
2. Migrar por entregas pequenas, com checklist de aceitacao.
3. Priorizar fundacao offline, catalogos por loja e fila de transmissao antes de telas operacionais maiores.
4. Manter a API nova como unica integracao de backend.

## Execucao local
Instalar dependencias:

```bash
npm install
```

Subir o app:

```bash
npx expo start
```

## Observacao importante
Este app esta em migracao incremental. Evite rewrite desnecessario e prefira evoluir por extensao da base atual.
