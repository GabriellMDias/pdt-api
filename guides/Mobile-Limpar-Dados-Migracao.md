# Mobile Limpar Dados Migracao

## Onde a funcionalidade aparecia no legado

No legado, a opcao `Limpar Dados` aparecia no drawer lateral da Home:

- `apps/mobile_old/mobile_front/app/home/index.tsx`
- rota aberta: `apps/mobile_old/mobile_front/app/cleardata/index.tsx`

O fluxo era:

1. abrir o drawer da Home
2. tocar em `Limpar Dados`
3. abrir uma tela propria com grupos de telas
4. marcar os modulos desejados
5. tocar em `Excluir`

## Fluxo visual real do legado

A tela antiga de limpeza:

- agrupava as opcoes pelos grupos de navegacao de `screensConfig`
- mostrava apenas telas que tinham `table !== null`
- usava checkbox por rotina
- tinha um unico botao `Excluir`
- mostrava um modal de progresso `Limpando dados...`
- ao final fazia `router.replace('/home')`

Arquivos principais:

- `apps/mobile_old/mobile_front/app/cleardata/index.tsx`
- `apps/mobile_old/mobile_front/constants/ScreensConfig.tsx`

## Quais dados eram apagados no legado

O legado apagava tabelas inteiras, sem filtro por usuario nem por loja.

Tabelas elegiveis pela UI:

- `logruptura`
- `logtroca`
- `logconsumo`
- `logproducao`
- `logbalancoitem`

Como isso era feito:

- `DELETE FROM <tabela>;`
- `DELETE FROM sqlite_sequence WHERE name = '<tabela>';`

Ou seja, a limpeza removia:

- historico transmitido
- historico pendente
- flags locais de transmissao
- ids autoincrement locais dessas tabelas

## Quais dados eram preservados no legado

A tela antiga nao oferecia limpeza para:

- `conprops`
- `loja`
- `produto`
- `tipoembalagem`
- `tipomotivotroca`
- `tipoconsumo`
- `receita`
- `balanco`
- `favoritos`
- tabela de migracao

Na pratica, isso significa que o legado preservava:

- configuracao do dispositivo e endpoints
- loja atual em `conprops.id_currentstore`
- ultima sincronizacao em `conprops.lastsync`
- catalogos locais sincronizados
- favoritos
- estado geral do login/configuracao do aparelho

## Escopo real no legado

O escopo era global no dispositivo para cada modulo selecionado, porque:

- as queries nao tinham `WHERE`
- as tabelas antigas de historico nao tinham `user_id`
- mesmo tabelas com `id_loja` eram apagadas por inteiro

Entao o comportamento real era:

- escolher uma ou mais rotinas
- apagar todo o historico local dessas rotinas no aparelho

## Confirmacao e seguranca no legado

O legado nao tinha uma confirmacao destrutiva explicita antes de apagar.

Ao tocar em `Excluir`:

- o app executava os `DELETE`
- exibia apenas o modal de progresso
- voltava para a Home

## Leitura funcional do comportamento antigo

`Limpar Dados` no legado nao era uma limpeza geral do app. Era uma limpeza seletiva de historico operacional por modulo.

O que ela apagava:

- logs locais de coleta/lancamento

O que ela nao apagava:

- catalogos
- configuracoes
- favoritos
- dados de contexto do dispositivo

## Adaptacao necessaria para o app novo

No app novo, portar literalmente o comportamento antigo seria arriscado, porque agora existem:

- varios usuarios no mesmo aparelho
- loja atual por usuario
- outbox separada
- preferencias por usuario
- catalogos offline-first compartilhados por loja

Por isso, a leitura correta do legado para a nova base e:

- preservar a ideia de limpar historico operacional por rotina
- nao portar a agressividade de apagar tudo globalmente no dispositivo

## Implementacao adotada no app novo

A implementacao nova manteve o ponto de entrada do legado:

- sidebar da Home

Tambem manteve a ideia central:

- selecionar uma ou mais rotinas
- executar limpeza de historico local por rotina

Mas a execucao final ficou adaptada para a arquitetura offline-first nova:

- escopo por usuario atual
- escopo por loja atual
- limpeza tambem da outbox correspondente aos registros removidos
- preservacao total de catalogos, sessao e preferencias
