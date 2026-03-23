# Mobile Troca Ajustes UX

## Motivo de troca em formato select

O motivo de troca na tela de coleta deixou de ser apenas um bloco informativo e passou a funcionar como um select visual.

Como ficou:

- a tela mostra o motivo atual em um campo pressionavel
- ao tocar, abre o mesmo modal de selecao de motivos da rotina
- os motivos continuam vindo da base local sincronizada em `exchange_reasons`
- o valor selecionado fica evidente no proprio campo e pode ser alterado sem sair da coleta

## Validacao de remocao maior que a coletada

A regra continua bloqueando a gravacao quando o operador tenta remover mais do que o saldo coletado pendente para o mesmo produto e motivo.

Como ficou:

- a validacao continua no fluxo local de persistencia
- quando falha, a tela mostra feedback visual com a mensagem:
  - `Quantidade removida maior que o total coletado!`
- o salvamento nao acontece

## Scroll da tela de coleta

A tela de coleta passou a usar layout rolavel para nao cortar o conteudo inferior em aparelhos Android menores.

Como ficou:

- `FeatureScreenLayout` da coleta agora roda com `scrollable`
- o corpo ganhou `paddingBottom` para respirar no fim da tela
- o teclado continua convivendo com o conteudo sem esconder campos importantes

## Comportamento decimal

A logica antiga de digitar inteiros e o app montar automaticamente `0,001`, `0,010`, `1,000` foi removida da troca.

Como ficou:

- produto decimal exige digitacao explicita da virgula
- o campo aceita numeros e um separador decimal
- `.` digitado no teclado e normalizado para `,` apenas para manter compatibilidade de entrada
- nao existe mais conversao automatica por escala de 3 casas

Parsing atual:

- o valor digitado e lido como texto
- o parsing troca `,` por `.` apenas na hora de converter para numero
- exemplo:
  - `1,250` vira `1.25` internamente
  - `2` vira `2`

## Observacoes

- a lista de sugestoes de produto continua funcionando como antes
- os ajustes desta etapa ficaram restritos a UX da coleta de troca, sem reescrever a rotina inteira
