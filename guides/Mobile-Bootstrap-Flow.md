# Mobile Bootstrap Flow

## Objetivo

Definir o fluxo inicial do app mobile apos autenticacao para deixar a aplicacao pronta para operacao offline-first, sem ainda implementar features operacionais.

## Escopo desta etapa

- validar sessao local e token online
- carregar contexto do usuario autenticado
- sincronizar dados mestres minimos
- persistir dados no SQLite
- registrar metadata de readiness e sincronizacao
- expor UI de loading, erro amigavel e retry

## Dados mestres minimos

Nesta etapa, o bootstrap prepara apenas o conjunto minimo necessario para as proximas features:

- contexto do usuario atual via `/account/me`
- catalogo de lojas via `/stores`
- permissoes do usuario por loja via `/permissions/:userId`
- base de usuarios offline para login via `/users/mobile-sync` continua separada no fluxo de auth

## Fluxo resumido

1. `useAuthStore.bootstrap()`
2. `bootstrapDatabase()` garante schema e migracoes
3. `resolveStoredAuthBootstrap()` valida sessao local e token expirado
4. Se nao houver sessao valida, o app fica `unauthenticated`
5. Se houver sessao valida, o app entra em `authenticated` e dispara `prepareApp('session_restore')`
6. `prepareAuthenticatedApp()` decide entre sync remoto ou uso de cache local
7. Se online com token valido:
   - chama `runInitialSync()`
   - busca `account/me`, `stores` e `permissions/:userId`
   - persiste tudo em SQLite
   - grava metadata em `app_meta`
   - registra `sync_runs` com escopo `app_bootstrap`
8. Se offline:
   - usa cache local se o minimo obrigatorio ja existir
   - se nao existir, entra em erro recuperavel com retry

## Servicos introduzidos

### `auth-bootstrap`

Arquivo: `apps/mobile/src/features/bootstrap/services/auth-bootstrap.ts`

Responsabilidades:

- resolver conectividade atual
- validar sessao local persistida
- invalidar sessao online sem token ou com token expirado
- alinhar `token-vault` com a sessao local

### `initial-sync`

Arquivo: `apps/mobile/src/features/bootstrap/services/initial-sync.ts`

Responsabilidades:

- chamar endpoints do bootstrap
- normalizar payload remoto
- salvar snapshot minimo no SQLite
- registrar execucao em `sync_runs`

### `app-readiness`

Arquivo: `apps/mobile/src/features/bootstrap/services/app-readiness.ts`

Responsabilidades:

- decidir entre sync remoto e uso de cache
- distinguir erros de autenticacao, offline e backend
- preservar operacao via cache quando o refresh remoto falha, se os dados minimos ja existirem

## Persistencia local

### Novas tabelas

Migration: `006-bootstrap-master-data`

- `auth_user_contexts`
  - contexto do usuario autenticado
  - campos principais: `active_status`, `notify_cost_center_type`, `codigo_usuario_vr_master`

- `master_stores`
  - catalogo local de lojas
  - campos principais: `description`, `store_name`, `active_status`

- `user_permission_scopes`
  - permissoes locais normalizadas por usuario e por loja
  - guarda tanto acesso global quanto acesso por loja

### Metadata em `app_meta`

Chaves por usuario:

- `bootstrap:user:{id}:ready`
- `bootstrap:user:{id}:last_prepared_at`
- `bootstrap:user:{id}:last_error_kind`
- `bootstrap:user:{id}:last_error_message`
- `bootstrap:user:{id}:account_synced_at`
- `bootstrap:user:{id}:stores_synced_at`
- `bootstrap:user:{id}:permissions_synced_at`

## Regras de readiness

O app so considera que existe base minima local quando:

- existe `auth_user_contexts` para o usuario atual
- existe metadata de sync para conta
- existe metadata de sync para lojas
- existe metadata de sync para permissoes

Observacao:

- o catalogo de lojas ou permissoes pode ser vazio e ainda assim estar sincronizado
- por isso o criterio principal e metadata + contexto local, nao quantidade de linhas

## Comportamento de UI

### Loading

Enquanto `appReadinessStatus === 'loading'`, a home exibe tela dedicada informando:

- validacao de sessao
- carga de contexto
- preparacao do banco local

### Erro offline

Quando nao ha internet e nao existe cache minimo:

- badge `Sem internet`
- mensagem explicita de falta de dados locais suficientes
- botoes `Tentar novamente` e `Sair`

### Erro de backend

Quando a API responde com erro real e nao ha cache suficiente:

- badge `Erro do backend`
- mensagem amigavel derivada da API
- botoes `Tentar novamente` e `Sair`

## Decisoes arquiteturais

- manter `useAuthStore` como orquestrador e mover regras pesadas para servicos dedicados
- separar `login offline` de `bootstrap de readiness`
- tratar o bootstrap como `pull` registrado em `sync_runs`
- persistir contexto e metadados por usuario, preparando a base para multiusuario
- usar cache local como fallback preferencial quando os dados minimos ja existem

## Riscos pendentes

- o endpoint `/permissions/:userId` hoje nao foi desenhado especificamente para o mobile
- ainda nao existe selecao explicita de loja ativa no app
- ainda nao ha refresh incremental de catalogos; esta etapa usa snapshot completo
- o app ainda nao executa sync automatico ao recuperar internet apos erro offline

## Proximos passos recomendados

1. adicionar selecao de loja ativa e persistencia desse contexto por usuario
2. expandir o bootstrap com catalogos operacionais quando a primeira feature vertical for iniciada
3. futuramente separar `pull full` de `pull incremental` com cursores por dominio
