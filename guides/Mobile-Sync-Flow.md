# Mobile Sync Flow

## Referencia de legado revisada

- No legado, a sincronizacao ficava centralizada principalmente em `apps/mobile_old/mobile_front/app/config/index.tsx` e podia ser disparada pela Home antiga em `apps/mobile_old/mobile_front/app/home/index.tsx`.
- A ruptura antiga em `apps/mobile_old/mobile_front/app/administrativo/ruptura/transmissionScreen.tsx` consumia `id_currentstore` global; ela nao escolhia loja dentro da feature.
- No app novo, a etapa anterior ainda deixava a ruptura com seletor proprio de loja e botao de atualizar catalogo. Nesta etapa isso foi removido para voltar ao modelo centralizado.

## Onde a sincronizacao pode ser disparada

### 1. Home / sidebar

- Entrada: drawer lateral da Home.
- Acao: `Sincronizar`.
- Fluxo:
  1. abre modal de selecao de loja
  2. usuario escolhe a loja
  3. o app executa o fluxo global unico
  4. ao concluir, a loja escolhida vira a loja atual do app

### 2. Configuracoes

- Entrada: rota `settings` aberta pela Home.
- Acoes:
  - toggle de `rupture_auto_transmit`
  - botao `Sincronizar`
- Fluxo de sync:
  1. abre modal de selecao de loja
  2. executa o mesmo fluxo global da Home
  3. persiste a loja atual do usuario

### 3. Login

- Entrada: botao `Sincronizar` na propria tela de login.
- Requisito:
  - usar login/email e senha preenchidos na tela
  - exige internet
- Fluxo:
  1. autentica temporariamente com as credenciais digitadas
  2. carrega lojas disponiveis
  3. abre modal de selecao de loja
  4. executa o mesmo fluxo global de sincronizacao
  5. salva dados localmente
  6. limpa o token temporario
  7. permanece na tela de login

## Fluxo global unico

- Implementacao central: `apps/mobile/src/features/sync/services/global-sync.service.ts`
- O fluxo global atual sincroniza tudo que o app novo realmente consome hoje:
  - contexto do usuario (`account/me`)
  - lojas
  - permissoes
  - catalogo de produtos da ruptura para a loja selecionada
- Ordem atual:
  1. sincronizacao de usuarios locais, quando aplicavel
  2. bootstrap remoto do usuario e dados mestres minimos
  3. pull do catalogo de ruptura da loja selecionada
  4. persistencia da loja atual do usuario

## Como a loja atual e escolhida e persistida

- Persistencia local: tabela `user_preferences`
- Migration: `apps/mobile/src/database/migrations/009-user-preferences.ts`
- Chave usada para loja atual:
  - `current_store_id`
- Regra:
  - a loja atual so muda apos uma sincronizacao concluida com sucesso
  - a loja e vinculada ao `user_id`
  - usuarios diferentes no mesmo aparelho podem ter lojas atuais diferentes

## Como a ruptura consome a loja atual

- A ruptura nao seleciona mais loja localmente.
- A tela principal da ruptura le `currentStoreId` do `useAuthStore`.
- A coleta e o scanner recebem esse contexto da loja atual, em vez de abrir seletor proprio.
- Se nao existir loja atual definida:
  - a ruptura bloqueia novas coletas
  - a tela orienta sincronizar pela Home ou por Configuracoes

## Parametro `rupture_auto_transmit`

- Persistencia local: tabela `user_preferences`
- Chave usada:
  - `rupture_auto_transmit`
- Regra:
  - `false` por padrao
  - `true`: apos salvar uma coleta, a ruptura tenta despachar a outbox automaticamente
  - `false`: a coleta fica pendente ate o usuario tocar em `Transmitir`
- Escopo:
  - preferencia por usuario
  - offline-first
  - preparada para sincronizacao futura, mas ainda local nesta etapa

## Correcao do fluxo de voltar na ruptura

- Problema anterior:
  - o scanner voltava para `rupture-collect` via navegacao com params
  - isso podia deixar telas empilhadas de forma indevida
  - ao voltar da coleta, o scanner podia reaparecer
- Correcao aplicada:
  - o scanner agora grava o resultado em um store transitivo local
  - em sucesso, ele executa `router.back()`
  - a tela de coleta consome esse resultado ao recuperar foco
- Resultado esperado:
  - voltar da coleta leva para a lista da ruptura
  - o scanner nao reabre sozinho
  - header back e back do Android ficam previsiveis

## Diferencas relevantes em relacao ao legado

- O legado centralizava sync, mas misturava configuracao de conexao, loja atual e execucao em um fluxo unico.
- O app novo centraliza sync sem reintroduzir configuracao de IP/porta na UI.
- A ruptura voltou a consumir uma loja global, como no legado, mas agora sobre SQLite estruturado, outbox e idempotencia.
- A sincronizacao pela login nao autentica o usuario definitivamente; ela apenas prepara a base local e retorna para a propria tela.

## Limitacoes atuais

- O fluxo global novo sincroniza os dominios realmente usados hoje no app novo.
- Catalogos futuros como tipos de consumo e tipos de troca ainda dependem de endpoints mobile-ready e da migracao dessas features.
- A sincronizacao pela login faz autenticacao temporaria para preparar a base local, mas nao cria sessao autenticada na Home.
