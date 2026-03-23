# Mobile Legado Inventario

## Objetivo
Este documento inventaria o legado mobile e o estado atual do novo app para servir como base objetiva de migracao assistida por IA.

Complementa:
- `guides/Migracao-Mobile-Incremental.md`
- `guides/Identidade-Visual-Mobile.md`

## Escopo analisado
- `apps/mobile`
- `apps/mobile_old/mobile_front`
- `apps/mobile_old/mobile_backend`
- `apps/api`
- `apps/web`
- `guides/Identidade-Visual-Mobile.md`

## Resumo executivo
- O legado mobile nao possui autenticacao por usuario. O acesso depende de configuracao local do dispositivo, teste de conexao e sincronizacao inicial da loja.
- O novo mobile ja possui autenticacao online/offline, cache local de usuarios, sessao persistida e tokens visuais basicos.
- O legado implementa 5 rotinas operacionais reais: `ruptura`, `balanco`, `consumo`, `troca` e `producao`.
- O backend legado escreve direto no ERP/VRMaster e concentra alto acoplamento em SQL manual.
- A API nova ainda nao possui endpoints mobile-ready para catalogos operacionais nem para transmissao das rotinas do legado.
- O `apps/web` hoje e a principal referencia visual e tambem contem uma feature de ruptura interna (`Atualizar Prateleiras`) que conversa com a API nova.

## 1. Features do mobile antigo

### 1.1 Features implementadas
| Feature | Origem principal | Observacao |
| --- | --- | --- |
| Bootstrap local | `apps/mobile_old/mobile_front/app/index.tsx` | Inicializa SQLite, verifica update de APK e decide entre `config` e `home`. |
| Configuracao do dispositivo | `apps/mobile_old/mobile_front/app/config/index.tsx` | Salva nome do dispositivo, IP interno/externo, portas e loja. |
| Sincronizacao inicial de catalogos | `apps/mobile_old/mobile_front/app/config/sync.ts` | Baixa lojas, produtos, tipos e balancos do backend legado. |
| Home + drawer | `apps/mobile_old/mobile_front/app/home/index.tsx` | Entrada principal apos sync, com menu lateral e atalhos. |
| Favoritos | `apps/mobile_old/mobile_front/app/favorites/index.tsx` | Permite marcar telas favoritas no SQLite. |
| Limpar dados locais | `apps/mobile_old/mobile_front/app/cleardata/index.tsx` | Limpa tabelas operacionais escolhidas pelo usuario. |
| Ruptura | `apps/mobile_old/mobile_front/app/administrativo/ruptura/*` | Coleta produtos por prateleira e transmite agrupado. |
| Balanco | `apps/mobile_old/mobile_front/app/estoque/balanco/*` | Lista balancos, coleta itens, transmite com idempotencia. |
| Consumo | `apps/mobile_old/mobile_front/app/estoque/consumo/*` | Coleta consumo por tipo e transmite payload consolidado. |
| Troca | `apps/mobile_old/mobile_front/app/estoque/troca/*` | Coleta troca por motivo e transmite payload consolidado. |
| Producao | `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx` | Registra producao por receita e transmite. |
| Scanner e busca de produto | `apps/mobile_old/mobile_front/components/ProductInput.tsx` | Busca por codigo interno, codigo de barras, descricao e pesaveis. |
| Exportacao TXT | `apps/mobile_old/mobile_front/components/ExportTxtData.tsx` | Exporta logs locais para arquivo texto. |
| Update de APK | `apps/mobile_old/mobile_front/utils/Updater.ts` | Consome backend legado para baixar APK mais recente. |

### 1.2 Features placeholder no menu legado
Existem varias entradas no menu antigo apontando para `apps/mobile_old/mobile_front/app/developing/index.tsx`, ou seja, ainda nao foram implementadas no legado e nao devem ser tratadas como paridade obrigatoria sem confirmacao funcional.

Principais placeholders:
- Cotacao fornecedor
- Cotacao cliente
- Pedido
- Venda PDV
- Venda periodo
- Analise de oferta
- Administracao de preco
- Cesta basica
- Perda
- Quebra
- Transferencia interna
- Estoque loja
- Validade
- Contas a pagar
- Contas a receber
- Conferencia NF entrada
- Saida
- Despesa
- Bonificacao
- Reposicao
- Controle de cargas
- Emissor etiqueta
- Estoque online
- Consultar preco
- DDV minimo
- VR Task
- Consistencia
- Motivo cancelamento
- Motivo desconto

## 2. Telas existentes no legado

### 2.1 Rotas reais
| Rota / tela | Arquivo | Papel |
| --- | --- | --- |
| `/` | `apps/mobile_old/mobile_front/app/index.tsx` | Bootstrap inicial, migracoes do SQLite e checagem de update. |
| `/config` | `apps/mobile_old/mobile_front/app/config/index.tsx` | Configuracao de dispositivo e sincronizacao inicial. |
| `/home` | `apps/mobile_old/mobile_front/app/home/index.tsx` | Home principal com drawer e favoritos. |
| `/screensmenu/[screenGroupId]` | `apps/mobile_old/mobile_front/app/screensmenu/[screenGroupId].tsx` | Lista as telas de um grupo do menu. |
| `/favorites` | `apps/mobile_old/mobile_front/app/favorites/index.tsx` | Edicao dos favoritos. |
| `/cleardata` | `apps/mobile_old/mobile_front/app/cleardata/index.tsx` | Limpeza seletiva das tabelas locais. |
| `/administrativo/ruptura/transmissionScreen` | `apps/mobile_old/mobile_front/app/administrativo/ruptura/transmissionScreen.tsx` | Lista pendencias e dispara transmissao de ruptura. |
| `/administrativo/ruptura/[prateleira]` | `apps/mobile_old/mobile_front/app/administrativo/ruptura/[prateleira].tsx` | Coleta de ruptura por prateleira. |
| `/estoque/balanco/transmissionScreen` | `apps/mobile_old/mobile_front/app/estoque/balanco/transmissionScreen.tsx` | Lista balancos pendentes e transmite. |
| `/estoque/balanco/lancamento/[idBalanco]` | `apps/mobile_old/mobile_front/app/estoque/balanco/lancamento/[idBalanco].tsx` | Lancamento rapido de itens do balanco. |
| `/estoque/balanco/[idBalanco]` | `apps/mobile_old/mobile_front/app/estoque/balanco/[idBalanco].tsx` | Lista itens coletados do balanco e transmite por balanco. |
| `/estoque/consumo/transmissionScreen` | `apps/mobile_old/mobile_front/app/estoque/consumo/transmissionScreen.tsx` | Lista pendencias e transmite consumo. |
| `/estoque/consumo/[idMotivoConsumo]` | `apps/mobile_old/mobile_front/app/estoque/consumo/[idMotivoConsumo].tsx` | Coleta consumo por motivo. |
| `/estoque/troca/transmissionScreen` | `apps/mobile_old/mobile_front/app/estoque/troca/transmissionScreen.tsx` | Lista pendencias e transmite troca. |
| `/estoque/troca/[idMotivoTroca]` | `apps/mobile_old/mobile_front/app/estoque/troca/[idMotivoTroca].tsx` | Coleta troca por motivo. |
| `/estoque/producao/transmissionScreen` | `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx` | Lista pendencias, registra producao e transmite. |
| `/developing` | `apps/mobile_old/mobile_front/app/developing/index.tsx` | Placeholder para telas nao implementadas. |

### 2.2 Grupos de menu do legado
Fonte principal:
- `apps/mobile_old/mobile_front/constants/ScreensConfig.tsx`

Grupos existentes:
- Menu Principal
- Administrativo
- Estoque
- Financeiro
- Nota Fiscal
- Logistica
- Utilitario
- PDV

Observacao:
- O menu antigo mistura features reais, placeholders e utilitarios operacionais. O shell do novo app deve separar melhor o que ja esta migrado do que ainda nao esta disponivel.

## 3. Fluxos de autenticacao

### 3.1 Legado
Nao existe autenticacao por usuario no legado.

Fluxo real:
1. `app/index.tsx` executa `DatabaseInit`.
2. O app chama `Updater` para verificar APK novo via backend legado.
3. Se ainda nao houve sincronizacao inicial (`conprops.lastsync` vazio/null), o app abre `/config`.
4. Em `/config`, o usuario informa nome do dispositivo, IP e porta do backend legado.
5. O app testa a conexao via `GET /testconnection/:devicename`.
6. O usuario escolhe a loja e dispara a sincronizacao inicial.
7. Apos sincronizar, o app entra em `/home`.

Consequencias tecnicas:
- sem JWT
- sem sessao por usuario
- sem permissao por usuario
- sem multiusuario
- sem separacao por loja por usuario, apenas `id_currentstore` global

### 3.2 Novo mobile
O novo mobile ja possui autenticacao real por usuario.

Fluxo atual:
1. `apps/mobile/app/_layout.tsx` chama `bootstrap()` e inicia monitor de rede.
2. O store `use-auth-store.ts` tenta restaurar sessao local.
3. Se online, o login usa `POST /auth/login`.
4. Apos login online, o app sincroniza usuarios via `GET /users/mobile-sync`.
5. O app busca o usuario atual via `GET /account/me`.
6. Usuarios sincronizados ficam em `auth_users`; a sessao fica em `auth_sessions`.
7. Se offline e ja houver usuarios sincronizados, o login valida hash de senha localmente.

Lacunas atuais:
- nao ha selecao de loja por usuario
- nao ha catalogos operacionais offline
- nao ha outbox de sincronizacao

## 4. Servicos e requisicoes

### 4.1 Frontend legado -> backend legado
| Metodo | Endpoint | Origem | Uso |
| --- | --- | --- | --- |
| `GET` | `/testconnection/:devicename` | `app/config/index.tsx` | Testa disponibilidade do backend legado. |
| `GET` | `/sync/stores` | `app/config/index.tsx`, `app/config/sync.ts` | Lista lojas para escolha e sync inicial. |
| `GET` | `/sync/tipoembalagem` | `app/config/sync.ts` | Baixa tipos de embalagem. |
| `GET` | `/sync/tipomotivotroca` | `app/config/sync.ts` | Baixa motivos de troca. |
| `GET` | `/sync/tipoconsumo` | `app/config/sync.ts` | Baixa tipos de consumo. |
| `POST` | `/sync/products` | `app/config/sync.ts` | Baixa catalogo de produtos por loja. |
| `POST` | `/sync/recipes` | `app/config/sync.ts` | Baixa receitas por loja. |
| `POST` | `/sync/balancos` | `app/config/sync.ts` | Baixa balancos da loja. |
| `POST` | `/transmit/lancamentoruptura` | `administrativo/ruptura/transmissionScreen.tsx` | Envia ruptura agrupada por prateleira. |
| `POST` | `/transmit/lancamentobalanco` | `estoque/balanco/*.tsx` | Envia itens de balanco; no legado mais recente usa idempotencia. |
| `POST` | `/transmit/lancamentoconsumo` | `estoque/consumo/transmissionScreen.tsx` | Envia consumo consolidado. |
| `POST` | `/transmit/lancamentotroca` | `estoque/troca/transmissionScreen.tsx` | Envia troca consolidada. |
| `POST` | `/transmit/lancamentoproducao` | `estoque/producao/transmissionScreen.tsx` | Envia producao. |
| `GET` | `/checkforupdate/getlatestversion/:ip/:port` | `utils/Updater.ts` | Verifica existencia de APK novo. |

### 4.2 Novo mobile -> API nova
| Metodo | Endpoint | Origem | Uso |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | `src/features/auth/api/auth-api.ts` | Login online por e-mail/login e senha. |
| `GET` | `/account/me` | `src/features/auth/api/auth-api.ts` | Resolve usuario autenticado apos login. |
| `GET` | `/users/mobile-sync` | `src/features/auth/api/sync-api.ts` | Baixa usuarios e permissoes para login offline. |

### 4.3 Web -> API nova
O `apps/web` nao substitui o mobile, mas interessa na migracao por dois motivos:
- e a referencia visual principal do novo mobile
- ja existe uma feature administrativa relacionada a ruptura em `pages/administrativo/rupturainterna/atualizarprateleiras`

## 5. Queries relevantes

### 5.1 SQLite do frontend legado
| Dominio | Arquivos | Tabelas / consultas relevantes |
| --- | --- | --- |
| Configuracao | `app/config/index.tsx`, `utils/getConProps.ts` | `conprops` guarda `devicename`, `ipint`, `portint`, `ipext`, `portext`, `id_currentstore`, `lastsync`, `app_version`. |
| Sync inicial | `app/config/sync.ts` | Limpa e repopula `loja`, `tipoembalagem`, `produto`, `receita`, `tipomotivotroca`, `tipoconsumo`, `balanco`; atualiza `conprops.id_currentstore` e `conprops.lastsync`. |
| Favoritos | `app/favorites/index.tsx`, `app/home/index.tsx` | `favoritos` guarda `id_screen` e `screen_group_id`. |
| Ruptura | `app/administrativo/ruptura/*.tsx` | Le `produto`, grava `logruptura`, marca `transmitido`. |
| Balanco | `app/estoque/balanco/*.tsx` | Le `balanco`, `produto`, `tipoembalagem`; grava `logbalancoitem`; atualiza `transmitido`. |
| Consumo | `app/estoque/consumo/*.tsx` | Le `produto`, `tipoembalagem`, `tipoconsumo`; grava `logconsumo`; atualiza `transmitido`. |
| Troca | `app/estoque/troca/*.tsx` | Le `produto`, `tipoembalagem`, `tipomotivotroca`; grava `logtroca`; atualiza `transmitido`. |
| Producao | `app/estoque/producao/transmissionScreen.tsx` | Le `receita`; grava `logproducao`; atualiza `transmitido`. |
| Limpeza local | `app/cleardata/index.tsx` | Limpa tabelas operacionais ligadas a cada feature. |

### 5.2 Query files do backend legado
| Arquivo | Papel | Tabelas ERP / VRMaster mais visiveis |
| --- | --- | --- |
| `src/database/queries/stores.ts` | Baixa lojas | `loja` |
| `src/database/queries/tipos.ts` | Baixa tipos operacionais | `tipoembalagem`, `tipomotivotroca`, `tipoconsumo`, outros tipos auxiliares |
| `src/database/queries/products.ts` | Baixa catalogo de produtos e parametros | `produto`, `produtocomplemento`, `produtoautomacao`, `produtoaliquota`, tabelas de associado |
| `src/database/queries/estoque/estoque.ts` | Regra comum de movimentacao e custo | `parametrovalor`, `parametro`, `estoquecongelado`, `logestoque`, `produtocomplemento` |
| `src/database/queries/estoque/consumo.ts` | Aplica consumo | `consumo`, `tipoconsumo`, `produto`, `produtoaliquota`, `produtocomplemento` |
| `src/database/queries/estoque/troca.ts` | Aplica troca | `produtocomplemento`, `logtroca`, tabelas de associado, `logestoque` via regra comum |
| `src/database/queries/estoque/producao.ts` | Aplica producao | `producao`, `producaoitem`, `receitaproduto`, `receitaloja`, `produtocomplemento` |
| `src/database/queries/estoque/balanco.ts` | Aplica contagem de balanco | `balanco`, `tipoestoquebalanco`, `balancoestoque` |
| `src/database/queries/administrativo/ruptura.ts` | Persiste ruptura coletada | `rupturacoletor` |
| `src/database/queries/logTransacao.ts` | Loga acao operacional | `logtransacao` e `versao` via `getVRVersion()` |

### 5.3 Regra compartilhada importante no legado
`consumo`, `troca` e `producao` usam a camada comum `generateStockMovement()` em `src/database/queries/estoque/estoque.ts` para:
- gerar `logestoque`
- atualizar `produtocomplemento.estoque`
- atualizar custo medio quando necessario

Implicacao para a migracao:
- parte da regra hoje nao esta no endpoint em si, mas sim nessa camada comum
- migrar endpoint por endpoint sem considerar essa regra central pode causar divergencia de estoque/custo

## 6. Pontos de acoplamento com VRMaster

### 6.1 Acoplamento direto no legado
- O backend legado escreve diretamente em tabelas do ERP.
- O legado depende do esquema do VRMaster para catalogos, estoque, custo, log de transacao e ruptura.
- Ha SQL dinamico com interpolacao em varios pontos do backend legado.
- Os payloads do mobile antigo ja chegam praticamente no formato esperado pelo ERP.

### 6.2 Acoplamento atual na API nova
| Dominio | Arquivo | Acoplamento atual |
| --- | --- | --- |
| Autenticacao | `apps/api/src/auth/auth.service.ts` | Resolve login do ERP pela tabela `usuario`. |
| Sync de usuarios | `apps/api/src/config/users/users.service.ts` | Usa `codigoUsuarioVrMaster` e consulta `usuario` para obter login do ERP. |
| Lojas | `apps/api/src/config/stores/stores.service.ts` | `getStoresFromVR()` le `loja` e `fornecedor`, depois upserta no banco auxiliar. |
| TOP / lookups | `apps/api/src/fiscal/top/top.service.ts` | Consulta `loja`, `produto`, `usuario`, `tipoproduto` diretamente no ERP, mas em formato paginado para web. |
| Ruptura interna | `apps/api/src/adm/ruptura/ruptura.service.ts` | Le `rupturacoletor` e atualiza `produtocomplemento.prateleira`. |

### 6.3 Regras para a migracao
- Evitar mudar o VRMaster para suportar a migracao do mobile.
- Preferir colocar metadados de sync, idempotencia e conciliacao no schema auxiliar `pdtconnect`.
- Reaproveitar consultas do ERP apenas como fonte de leitura ou como regra isolada no backend novo.

## 7. O que ja existe no mobile novo

### 7.1 App novo implementado
| Area | Arquivos | O que existe |
| --- | --- | --- |
| Bootstrap | `apps/mobile/app/_layout.tsx` | Bootstrap de auth e monitor de rede. |
| Rota inicial | `apps/mobile/app/index.tsx` | Redireciona para login ou home conforme sessao. |
| Home | `apps/mobile/app/home.tsx`, `src/features/auth/components/home-screen.tsx` | Tela placeholder autenticada com logout e sync de usuarios. |
| Tema | `src/theme/tokens.ts` | Tokens visuais alinhados ao guia web/mobile. |
| API client | `src/services/api.ts`, `src/config/env.ts` | Cliente Axios com `Authorization` automatica e `API_URL` por ambiente. |
| Persistencia | `src/database/client.ts`, `src/database/migrations.ts` | SQLite com schema inicial e migrator manual. |
| Auth local | `src/features/auth/data/auth-db.ts` | `auth_users`, `auth_sessions`, `app_meta`. |
| Login online/offline | `src/features/auth/store/use-auth-store.ts` | Login online, bootstrap de sessao, offline auth por hash local. |
| Sync de usuarios | `src/features/auth/api/sync-api.ts` | Download de usuarios e permissoes para login offline. |

### 7.2 Contribuicao do `apps/web`
O `apps/web` hoje contribui principalmente com:
- identidade visual (tokens, superficies, estados, cards, modais, tabelas)
- shell de aplicacao com sidebar, topbar e notificacoes
- padrao de formularios e componentes base
- referencia para dark mode como padrao

Arquivos mais relevantes para o mobile:
- `apps/web/src/index.css`
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/Sidebar/Sidebar.tsx`
- `apps/web/src/components/inputs/styles.ts`
- `apps/web/src/components/inputs/DefaultButton.tsx`
- `apps/web/src/components/table/TableCard.tsx`
- `apps/web/src/components/modals/ConfirmModal.tsx`

## 8. O que falta implementar no mobile novo

### 8.1 Fundacao
- contexto de loja por usuario
- shell de navegacao real
- componentes base reutilizaveis mais proximos do web
- scanner / busca de produto
- modelagem SQLite para catalogos e operacoes

### 8.2 Sync
- catalogos offline por loja
- sincronizacao incremental por dominio
- outbox unica com retry e backoff
- idempotencia ponta a ponta
- suporte a conciliacao de respostas parciais

### 8.3 Features operacionais
- ruptura
- balanco
- consumo
- troca
- producao

### 8.4 Suporte operacional
- favoritos no novo shell
- limpeza seletiva de dados locais por dominio
- exportacao diagnostica de logs
- estrategia nova de distribuicao/update

## 9. Riscos tecnicos identificados
- O legado mistura regra de negocio e escrita direta no ERP, o que dificulta migracao 1:1.
- O novo mobile ja tem autenticacao; voltar ao modelo de dispositivo do legado seria regressao.
- `top/products` e `top/stores` na API nova sao consultas paginadas para UI web, nao um catalogo offline pronto para o mobile.
- A API nova ainda nao possui contrato de transmissao idempotente para as rotinas do legado.
- O schema local antigo tem inconsistencias de migracao e nao deve ser portado literalmente.
- `apps/mobile_old` esta fora do versionamento atual do repositorio (`git status` mostra como nao rastreado), entao deve ser tratado como referencia e nao como base de merge.
