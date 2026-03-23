# Mobile Global Settings and SafeArea

## Referencias revisadas

- Legado: `apps/mobile_old/mobile_front/app/config/index.tsx`
- Legado: `apps/mobile_old/mobile_front/app/administrativo/ruptura/transmissionScreen.tsx`
- Legado: `apps/mobile_old/mobile_front/components/TransmissionList.tsx`
- Novo app: `apps/mobile/src/features/settings/components/settings-screen.tsx`
- Novo app: `apps/mobile/src/features/auth/store/use-auth-store.ts`
- Novo app: `apps/mobile/src/features/settings/services/user-settings.service.ts`
- Novo app: `apps/mobile/src/features/rupture/components/rupture-screen.tsx`

## Parametro global de transmissao automatica

- O parametro deixou de ser conceitualmente da ruptura.
- Nome novo no app: `autoTransmitEnabled`.
- Chave persistida no SQLite por usuario: `auto_transmit_enabled`.
- Tabela local usada: `user_preferences`.
- Escopo: qualquer rotina operacional atual ou futura pode consultar o mesmo valor.

### Compatibilidade com o que ja existia

- O loader local ainda reconhece a chave antiga `rupture_auto_transmit` como fallback.
- Ao salvar pelo app novo, a preferencia passa a ser gravada somente na chave global nova.

## Onde a configuracao e consumida

- Fonte unica de verdade em runtime: `useAuthStore`.
- Carregamento inicial: `loadUserScopedSettings(userId, stores)`.
- Persistencia: `setAutoTransmitEnabledForUser(userId, enabled)`.
- Uso atual: a coleta de ruptura consulta `autoTransmitEnabled` para decidir se tenta flush automatico da outbox apos salvar.

## Loja atual e configuracoes por usuario

- A loja atual continua persistida por usuario na mesma tabela `user_preferences`.
- Chave usada: `current_store_id`.
- A sincronizacao global continua escolhendo a loja e salvando esse contexto para o usuario autenticado.
- A ruptura consome apenas essa loja atual global; nao ha seletor proprio na feature.

## Safe area padronizada

## Problema anterior

- Varias telas renderizavam `HomeHeader` fora do `SafeAreaView`.
- Nessas telas, parte do conteudo podia ficar sob status bar/notch, mesmo com `Screen` existente.

## Solucao aplicada

- Foi criado um layout compartilhado: `apps/mobile/src/features/shared/components/feature-screen-layout.tsx`.
- Esse layout centraliza:
  - `SafeAreaView`
  - `HomeHeader`
  - conteudo scrollable ou fixo
  - paddings padrao das telas internas

## Telas ajustadas

- `Configuracoes`
- `Ruptura`
- `Coleta de ruptura`
- `Editar Favoritos`
- `Placeholder de menu`
- fallback de `HomeGroup`

## Organizacao da tela de configuracao

- A tela manteve o botao `Sincronizar`.
- A selecao de loja continua acontecendo no fluxo de sincronizacao.
- A loja atual continua exibida junto da ultima sincronizacao global.
- O bloco de configuracao agora fala em transmissao do app, e nao mais em transmissao da ruptura.

## Ajustes feitos na lista principal da ruptura

- Removido o texto `Catalogo x produto(s)...`.
- Removido o texto `Transmissao manual ativa...` ou equivalente.
- A loja atual agora aparece logo abaixo da ultima sincronizacao.
- Removidos os cards informativos extras apos transmitir.
- Removidos os cards informativos extras apos excluir item.
- A exclusao deixou de pedir confirmacao adicional.
- A exclusao continua segura porque o item some da lista e a persistencia local e atualizada imediatamente.

## Comparacao com o legado

- O legado centralizava configuracao e sincronizacao fora da ruptura.
- O novo app agora segue esse mesmo principio, mas sobre a arquitetura offline-first atual.
- A lista da ruptura volta a ficar mais operacional, como no legado, com menos texto auxiliar e menos blocos intermediarios.

## Limitacoes atuais

- O parametro global ainda esta exposto em formato booleano simples (`autoTransmitEnabled`).
- Futuramente, se surgir necessidade de modos diferentes por rotina, o modelo pode evoluir para um enum sem quebrar a ideia de configuracao global.
- O sync global hoje centraliza o que o app novo ja consome; novos catalogos ainda devem entrar no mesmo fluxo conforme as proximas rotinas forem migradas.
