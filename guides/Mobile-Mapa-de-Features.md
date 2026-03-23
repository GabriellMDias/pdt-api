# Mobile Mapa de Features

## Objetivo
Comparar cada feature relevante do legado com seu destino no novo app, o backend novo correspondente e a estrategia de migracao.

Status permitidos:
- `reaproveitar`: manter base atual com ajustes pequenos
- `adaptar`: reaproveitar regras/fluxo, mas reimplementar na nova arquitetura
- `refazer`: abandonar a abordagem antiga e reconstruir no novo stack

## Tabela comparativa
| Feature antiga | Origem no legado | Destino no novo app | Backend novo correspondente | Status |
| --- | --- | --- | --- | --- |
| Bootstrap inicial do app | `apps/mobile_old/mobile_front/app/index.tsx` | `apps/mobile/app/_layout.tsx` + fluxo inicial baseado em auth/sessao | Nao depende de endpoint especifico | adaptar |
| Acesso por dispositivo sem login | `apps/mobile_old/mobile_front/app/config/index.tsx` | Substituido por autenticacao de usuario no novo mobile | `POST /auth/login`, `GET /account/me`, `GET /users/mobile-sync` | refazer |
| Configuracao manual de IP/porta | `apps/mobile_old/mobile_front/app/config/index.tsx` | Setup por ambiente + contexto de loja no app novo | Hoje apenas `ENV.API_URL`; ainda falta contrato de loja mobile | refazer |
| Sincronizacao inicial monolitica | `apps/mobile_old/mobile_front/app/config/sync.ts` | Engine de sync por dominio e por loja | Nao existe ainda; `stores` e `top/*` nao cobrem o contrato mobile | refazer |
| Home com drawer | `apps/mobile_old/mobile_front/app/home/index.tsx` | Home autenticada e shell mobile alinhado ao web | Nao depende de backend especifico | adaptar |
| Favoritos | `apps/mobile_old/mobile_front/app/favorites/index.tsx` | Favoritos do shell novo persistidos por usuario | Nao existe ainda | adaptar |
| Limpar dados locais | `apps/mobile_old/mobile_front/app/cleardata/index.tsx` | Ferramenta de limpeza por dominio no novo app | Nao existe ainda | adaptar |
| Scanner e busca de produto | `apps/mobile_old/mobile_front/components/ProductInput.tsx` | Componente compartilhado para features operacionais | Depende de catalogo mobile de produtos ainda inexistente | adaptar |
| Lista de pendencias/transmissao | `apps/mobile_old/mobile_front/components/TransmissionList.tsx` | Lista operacional padronizada do novo app | Depende da outbox e contratos de sync | adaptar |
| Exportacao TXT de logs | `apps/mobile_old/mobile_front/components/ExportTxtData.tsx` | Ferramenta diagnostica opcional do novo app | Nao existe ainda | adaptar |
| Ruptura | `apps/mobile_old/mobile_front/app/administrativo/ruptura/*` | Primeira feature operacional sugerida no novo app | Hoje existe apenas `POST /ruptura/atualizar-prateleira`, que nao recebe coleta mobile | adaptar |
| Balanco | `apps/mobile_old/mobile_front/app/estoque/balanco/*` | Segunda feature operacional sugerida no novo app | Nao existe endpoint novo equivalente | adaptar |
| Consumo | `apps/mobile_old/mobile_front/app/estoque/consumo/*` | Feature operacional futura no novo app | Nao existe endpoint novo equivalente | adaptar |
| Troca | `apps/mobile_old/mobile_front/app/estoque/troca/*` | Feature operacional futura no novo app | Nao existe endpoint novo equivalente | adaptar |
| Producao | `apps/mobile_old/mobile_front/app/estoque/producao/transmissionScreen.tsx` | Feature operacional futura no novo app | Nao existe endpoint novo equivalente | adaptar |
| Update por APK servido pelo backend legado | `apps/mobile_old/mobile_front/utils/Updater.ts` + `apps/mobile_old/mobile_backend/src/checkForUpdate/index.ts` | Estrategia nova de distribuicao/update | Nao existe definicao ainda | refazer |
| Tema e linguagem visual do legado | `apps/mobile_old/mobile_front/app/_layout.tsx` + estilos locais | Substituido pela identidade de `apps/web` | Guia em `guides/Identidade-Visual-Mobile.md` | refazer |
| Login online/offline do novo app | Nao existia no legado | Base atual de `apps/mobile/src/features/auth/*` | `auth`, `account`, `users/mobile-sync` | reaproveitar |

## Notas por feature

### Auth
- O legado nao tinha usuario autenticado.
- O novo fluxo de auth ja atende uma parte importante da migracao e nao deve ser desmontado.
- A proxima evolucao e adicionar contexto de loja e permissoes de navegacao sem quebrar o login offline.

### Sync
- O legado fazia `download total + delete + refill`.
- O novo app precisa de sync por dominio e checkpoint por loja.
- `GET /top/products` e `GET /top/stores` hoje sao consultas paginadas para UI web e nao substituem sync offline.

### Ruptura
- O legado agrupa produtos por prateleira antes do envio.
- O `apps/web` ja possui uma etapa administrativa de `Atualizar Prateleiras`.
- A API nova ainda nao possui o endpoint de ingestao mobile equivalente ao legado.

### Balanco
- O legado ja possui o melhor caso de resiliencia: soma local, ordenacao estavel, chunking e idempotencia.
- Esse fluxo deve ser reutilizado como regra, nao copiado literalmente.
- O suporte de idempotencia precisa migrar para `apps/api` com tabela auxiliar em `pdtconnect`.

### Consumo / Troca / Producao
- As tres features usam fortemente regra de estoque/custo do backend legado.
- O risco principal nao esta na tela, e sim em como a API nova vai encapsular a regra sem escrever direto no ERP de forma descontrolada.

## Dependencias entre features
| Feature | Depende de | Observacao |
| --- | --- | --- |
| Favoritos | Shell novo | Sem home/menu real, favoritos nao tem onde aparecer. |
| Scanner e busca de produto | Catalogo offline de produtos | Nao vale portar o componente sem dados locais corretos. |
| Ruptura | Catalogo de produtos, outbox, contrato de transmissao novo | Melhor primeira feature por payload simples. |
| Balanco | Catalogo de produtos, balancos por loja, outbox, idempotencia | Melhor segunda feature por exercer retransmissao segura. |
| Consumo | Catalogo de produtos, tipos de consumo, regra backend | Depende de encapsular regra ERP no backend novo. |
| Troca | Catalogo de produtos, motivos de troca, regra backend | Tem dependencias parecidas com consumo. |
| Producao | Catalogo de produtos, receitas, regra de custo/estoque | E a mais sensivel entre as features de estoque. |
| Update/distribuicao | Build pipeline e politica de release | Nao depende do legado e nao deve copiar `rn-update-apk` por default. |

## Riscos tecnicos por feature
- `Ruptura`: risco de mapear errado a relacao entre coleta mobile e etapa administrativa posterior.
- `Balanco`: risco alto de duplicidade sem idempotencia e ack parcial.
- `Consumo`: risco de divergencia de estoque se a API nova nao encapsular a regra comum do legado.
- `Troca`: risco de tratar errado produto associado e estoque da troca.
- `Producao`: risco alto de divergencia de custo medio e baixa de receita.
- `Sync`: risco de usar endpoints web paginados como base de cache offline.
- `Update`: risco de ficar preso ao modelo de APK distribuido pelo backend legado.

## Recomendacao de sequencia de migracao
1. Manter e estender a base atual de auth (`reaproveitar`).
2. Refazer sync, contexto de loja e update/distribuicao no novo stack.
3. Adaptar `Ruptura` como primeira feature operacional.
4. Adaptar `Balanco` como segunda feature operacional.
5. Adaptar `Consumo`, `Troca` e `Producao` depois que outbox e idempotencia estiverem consolidadas.
