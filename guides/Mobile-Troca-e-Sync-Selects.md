# Mobile Troca e Sync Selects

## Select de motivo de troca

O motivo de troca agora existe em dois pontos do fluxo:

- no modal aberto a partir do botao `+` da tela principal de troca
- na propria tela de coleta, para permitir ajuste rapido sem sair da rotina

Motivo da duplicacao controlada:

- o fluxo correto do legado escolhe o motivo antes da coleta
- o select na coleta foi mantido porque ficou bom para ajuste rapido e nao quebra a arquitetura atual

Implementacao:

- o modal de motivo passou a usar um select visual, em vez de lista solta
- os motivos continuam vindo da base local sincronizada
- o operador confirma o motivo no modal e so depois segue para a coleta

## Select de loja na sincronizacao

A selecao de loja do sync deixou de ser uma lista de cards e passou a usar um select visual no modal.

Onde isso vale:

- sincronizacao pela Home/sidebar
- sincronizacao pela tela de Configuracoes
- sincronizacao inicial pela tela de Login

## Filtro de lojas

### Backend

Foi verificado que existe campo de atividade no backend auxiliar:

- `Store.activeStatus` no Prisma

Filtros aplicados no endpoint `GET /stores`:

- `id > 0`
- `activeStatus = true`

Isso remove:

- loja `0`, que representa `Sem Loja`
- lojas inativas no cadastro auxiliar

### Frontend

O mobile tambem reforca o filtro localmente no helper `getSelectableSyncStores`, mantendo apenas:

- `id > 0`
- `activeStatus !== false`

Esse reforco evita que uma lista invalida apareca mesmo se algum fluxo local antigo ainda entregar dados nao tratados.

## Observacoes

- nao foi necessario reescrever o fluxo de sync
- o backend tinha campo claro de loja ativa, entao foi possivel aplicar o filtro principal no servidor
- a troca nao perdeu o select da tela de coleta; ele foi mantido e o modal de entrada passou a ter o select que faltava
