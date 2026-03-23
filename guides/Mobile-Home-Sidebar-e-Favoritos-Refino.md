# Mobile Home Sidebar e Favoritos Refino

## Sidebar da Home

### Itens removidos

Foram removidos do sidebar:

- `Marcar tudo como nao transmitido`
- linha `Login: ...`
- linha separada `Usuario VRMaster: ...`
- texto com quantidade de lojas disponiveis
- linha `Permissoes locais: ...`

### Exibicao do usuario

O usuario agora aparece de forma compacta em uma unica linha:

- `Nome do Usuario - codigoVRMaster`

Se o codigo VRMaster nao existir, a linha mostra apenas o nome.

### Sessao e rede

`Sessao` e `Rede` deixaram de mostrar texto `Online/Offline`.

Agora o sidebar usa:

- pill compacta
- icone pequeno
- ponto de status por cor

Isso reduz ruido visual e deixa a leitura mais proxima do papel operacional da Home antiga.

## Tela de Editar Favoritos

### Aproximacao com o legado

A organizacao foi aproximada da tela antiga em `apps/mobile_old/mobile_front/app/favorites/index.tsx`:

- grupos recolhidos por padrao
- expansao manual por toque no cabecalho
- seta indicando aberto/fechado
- lista interna mostrada apenas quando o grupo esta expandido

### O que mudou

- textos explicativos desnecessarios foram removidos
- descricoes longas de cada item nao sao mais exibidas na lista
- a tela nao abre mais todos os grupos de uma vez
- a selecao continua funcionando normalmente por usuario

### Estrutura final

- cabecalho do grupo com seta, icone, nome e contador
- ao expandir, itens compactos com icone, nome e marcador de selecionado
- favoritos selecionados continuam visiveis no topo como chips removiveis

## Adaptacao ao design system atual

O comportamento foi puxado para mais perto do legado, mas mantendo:

- `Card`
- `Button`
- tema light/dark
- persistencia atual de favoritos por usuario

Ou seja, a experiencia ficou mais compacta e organizada sem reintroduzir a estrutura antiga literalmente.
