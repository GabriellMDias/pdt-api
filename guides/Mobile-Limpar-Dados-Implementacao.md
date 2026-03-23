# Mobile Limpar Dados Implementacao

## Onde a funcionalidade foi implementada

Entrada principal:

- sidebar da Home em `apps/mobile/src/features/home/components/home-shell.tsx`

Rota:

- `apps/mobile/app/clear-data.tsx`

Tela:

- `apps/mobile/src/features/clear-data/components/clear-data-screen.tsx`

Base tecnica:

- `apps/mobile/src/features/clear-data/services/clear-data.service.ts`
- `apps/mobile/src/database/repositories/clear-data.repository.ts`

## Fluxo visual adotado

O fluxo ficou proximo do legado:

1. abrir sidebar da Home
2. tocar em `Limpar Dados`
3. abrir tela propria da funcionalidade
4. marcar as rotinas desejadas
5. tocar em `Excluir dados`
6. confirmar a exclusao
7. visualizar modal de progresso `Limpando dados...`
8. voltar para a Home apos concluir

Diferencas intencionais em relacao ao legado:

- confirmacao destrutiva explicita antes de apagar
- exibicao do usuario atual e da loja atual afetados
- texto explicando claramente o que nao sera apagado

## Quais dados sao apagados

A limpeza remove somente o historico operacional da loja atual para o usuario atual nas rotinas selecionadas.

Tabelas operacionais cobertas:

- `rupture_entries`
- `exchange_entries`
- `consumption_entries`
- `production_entries`
- `balance_entries`

Tambem sao removidos:

- eventos correspondentes em `sync_outbox_events`

Regras:

- remove tanto pendentes quanto transmitidos da rotina selecionada
- remove somente registros com `user_id = usuario atual`
- remove somente registros com `store_id = loja atual`

## Quais dados sao preservados

Nao entram na limpeza:

- `catalog_products`
- `exchange_reasons`
- `consumption_reasons`
- `production_recipes`
- `production_recipe_outputs`
- `production_recipe_inputs`
- `balance_headers`
- `auth_users`
- `auth_sessions`
- `auth_user_contexts`
- `master_stores`
- `user_permission_scopes`
- `home_favorites`
- `user_preferences`
- `app_meta`
- `sync_runs`

Em termos funcionais, continuam preservados:

- login e sessao
- loja atual
- tema
- favoritos
- catálogos locais
- sincronizacao global

## Como a limpeza foi organizada tecnicamente

Foi adotada uma estrutura centralizada:

### Configuracao de rotinas

Arquivo:

- `apps/mobile/src/features/clear-data/config.ts`

Responsabilidade:

- define quais rotinas aparecem na tela
- define agrupamento visual por `Administrativo` e `Estoque`

### Service

Arquivo:

- `apps/mobile/src/features/clear-data/services/clear-data.service.ts`

Responsabilidade:

- recebe rotinas selecionadas
- normaliza o conjunto
- chama a limpeza central
- devolve resumo consolidado

### Repository

Arquivo:

- `apps/mobile/src/database/repositories/clear-data.repository.ts`

Responsabilidade:

- executa a limpeza em transacao
- resolve a tabela de cada rotina
- coleta `event_id` dos registros no escopo
- apaga registros operacionais
- apaga eventos correspondentes da outbox
- faz exclusao em lotes na outbox para nao depender de um `IN` gigante

## Como o comportamento do legado foi adaptado

Do legado foi mantido:

- a entrada pelo menu lateral
- a ideia de selecionar rotinas antes de excluir
- a limpeza do historico operacional por modulo
- o modal de progresso durante a operacao

Do legado nao foi portado literalmente:

- exclusao global no dispositivo sem filtro
- ausencia de confirmacao destrutiva

Esses pontos foram adaptados porque a base nova tem:

- multiplos usuarios no mesmo aparelho
- loja atual por usuario
- outbox separada do historico
- preferencias e catalogos compartilhados

## Pos-limpeza

Depois de limpar:

- as rotinas selecionadas ficam sem historico local no escopo limpo
- as telas continuam operacionais
- catalogos continuam disponiveis
- a sincronizacao continua funcionando normalmente
- ao reentrar nas rotinas, a UI recarrega a base ja vazia

## Limites e refinamentos futuros

Pontos ainda possiveis para evolucao:

- mostrar contagem previa por rotina antes da confirmacao
- oferecer `marcar tudo` e `desmarcar tudo`
- permitir um modo administrativo mais forte para limpeza por todas as lojas, se isso algum dia for realmente necessario

Esses refinamentos nao entraram agora para manter a primeira versao segura e previsivel.
