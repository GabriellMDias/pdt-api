# Mobile Limpar Dados Scope

## Escopo proposto no app novo

A funcionalidade `Limpar Dados` deve manter a intencao do legado, mas com escopo seguro:

- entrada pela Home sidebar, no lugar do placeholder atual de `Limpar Dados`
- tela propria de selecao por rotina, semelhante ao legado
- limpeza restrita ao `usuario autenticado + loja atual + rotinas selecionadas`

Esse escopo evita apagar dados de:

- outro usuario no mesmo aparelho
- outra loja sincronizada para o mesmo usuario
- catalogos e configuracoes necessarias para o app continuar operando

## Onde a opcao deve aparecer

Sugestao principal:

- manter a entrada no drawer lateral da Home

Justificativa:

- e onde ela existia no legado
- o app novo ja possui a acao `clear-data` placeholder em `apps/mobile/src/features/home/components/home-shell.tsx`
- evita duplicar entrada em varios lugares antes da funcionalidade estabilizar

## UX proposta

Fluxo sugerido:

1. tocar em `Limpar Dados` no sidebar
2. abrir tela com checkboxes por rotina
3. exibir claramente a loja atual e o usuario atual
4. tocar em `Excluir dados`
5. abrir confirmacao destrutiva
6. executar limpeza em transacao
7. voltar para a Home ou permanecer na tela com mensagem de sucesso

## Texto de confirmacao sugerido

Titulo:

- `Excluir dados locais`

Mensagem:

- `Os lancamentos locais selecionados serao removidos para o usuario atual na loja atual. Itens pendentes e itens ja transmitidos dessas rotinas serao apagados. Catalogos, sessao, favoritos, tema e loja atual nao serao alterados.`

Aviso adicional quando houver pendencias:

- `Itens pendentes ainda nao transmitidos tambem serao excluidos e nao poderao ser enviados depois.`

## Dados que devem ser apagados

Escopo base:

- historico local das rotinas selecionadas
- outbox correspondente aos eventos desses historicos

Tabelas operacionais do app novo:

- `rupture_entries`
- `exchange_entries`
- `consumption_entries`
- `production_entries`
- `balance_entries`

Tabela relacionada que tambem deve ser afetada:

- `sync_outbox_events`

Regra importante:

- a exclusao de `sync_outbox_events` deve ser feita por `event_id` associado aos registros apagados
- nao por `DELETE` amplo em toda a outbox

## Dados que nao devem ser apagados

Tabelas e entidades que devem ser preservadas:

- `auth_users`
- `auth_sessions`
- `auth_user_contexts`
- `master_stores`
- `user_permission_scopes`
- `catalog_products`
- `exchange_reasons`
- `consumption_reasons`
- `production_recipes`
- `production_recipe_outputs`
- `production_recipe_inputs`
- `balance_headers`
- `home_favorites`
- `user_preferences`
- `app_meta`
- `sync_runs`

Preservacoes funcionais esperadas:

- sessao atual
- usuario atual
- loja atual
- tema light/dark
- transmissao automatica
- favoritos
- catalogos sincronizados
- historico tecnico de sincronizacao
- device id de sync

## Correspondencia entre legado e app novo

No legado:

- `logruptura` -> `rupture_entries`
- `logtroca` -> `exchange_entries`
- `logconsumo` -> `consumption_entries`
- `logproducao` -> `production_entries`
- `logbalancoitem` -> `balance_entries`

Diferenca importante:

- no app novo o estado de transmissao nao fica mais dentro da tabela de historico
- ele fica em `sync_outbox_events`

Portanto, limpar historico com seguranca no app novo exige apagar os dois lados:

- registro operacional
- evento correspondente da outbox

## Riscos principais

### Risco 1: apagar catalogos e quebrar a operacao offline

Mitigacao:

- nao incluir tabelas de catalogo na limpeza

### Risco 2: apagar configuracoes do usuario

Mitigacao:

- nao tocar em `user_preferences`, `home_favorites` e `auth_sessions`

### Risco 3: apagar eventos de outras rotinas ou de outra loja

Mitigacao:

- limpar por rotina selecionada
- filtrar por `user_id` e `store_id`
- apagar `sync_outbox_events` somente pelos `event_id` coletados da rotina

### Risco 4: deixar orfaos entre historico e outbox

Mitigacao:

- executar tudo em transacao
- primeiro levantar os `event_id` do escopo
- apagar registros operacionais e outbox no mesmo bloco

## Escopo recomendado por rotina

Ruptura:

- apagar `rupture_entries` do usuario atual na loja atual
- apagar eventos da outbox ligados a esses `event_id`

Troca:

- apagar `exchange_entries` do usuario atual na loja atual
- apagar eventos da outbox ligados a esses `event_id`

Consumo:

- apagar `consumption_entries` do usuario atual na loja atual
- apagar eventos da outbox ligados a esses `event_id`

Producao:

- apagar `production_entries` do usuario atual na loja atual
- apagar eventos da outbox ligados a esses `event_id`

Balanco:

- apagar `balance_entries` do usuario atual na loja atual
- apagar eventos da outbox ligados a esses `event_id`
- preservar `balance_headers`, pois sao catalogo

## O que nao entra no escopo da primeira versao

Nao recomendo incluir agora:

- limpeza global do dispositivo
- limpeza por todas as lojas
- limpeza de catalogos
- limpeza de login/sessao
- limpeza de favoritos
- limpeza de preferencias
- limpeza de `sync_runs`

Se isso for necessario no futuro, deve virar uma ferramenta separada e mais explicita, nao a mesma UX de `Limpar Dados`.

## Proposta funcional final

Comportamento recomendado para a primeira implementacao:

- mesma entrada do legado: sidebar da Home
- mesma ideia do legado: escolher rotinas para limpar
- diferenca de seguranca: escopo por usuario atual e loja atual
- limpeza de pendentes e transmitidos da rotina selecionada
- preservacao total de catalogos, sessao, loja atual e preferencias

## Implementacao efetivamente adotada

Na implementacao atual do app novo:

- a opcao continua no sidebar da Home
- a limpeza abre uma tela propria
- o usuario escolhe entre:
  - Ruptura
  - Balanco
  - Consumo
  - Producao
  - Troca
- a confirmacao textual explicita o que sera removido e o que sera preservado
- a exclusao roda em transacao e remove:
  - registros operacionais da rotina selecionada
  - eventos correspondentes em `sync_outbox_events`

O restante do banco local permanece preservado.
