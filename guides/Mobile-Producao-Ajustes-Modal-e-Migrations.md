# Mobile Producao Ajustes Modal e Migrations

## Unificacao das migrations 012 e 013

Os ajustes estruturais finais da producao foram absorvidos diretamente em [012-production-foundation.ts](/c:/Users/Gabriel/Workspace/pdt-api/apps/mobile/src/database/migrations/012-production-foundation.ts).

Com isso:

- a migration separada `013-production-recipe-normalization.ts` foi removida
- a modelagem final da producao passou a nascer correta desde a primeira criacao do banco
- o catalogo de producao continua usando o schema version `13`, mesmo dentro da migration `012`, para evitar downgrade artificial em bases de desenvolvimento que ja tinham avancado o `user_version`

### Modelagem final

O SQLite local da producao ficou assim:

- `production_recipes`
  - cabecalho da receita por loja
- `production_recipe_outputs`
  - produtos de destino da receita por loja
- `production_recipe_inputs`
  - insumos de origem da receita por loja
- `production_entries`
  - lancamentos locais enviados pela outbox

Como ainda estamos em desenvolvimento, a migration consolidada pode resetar o catalogo local de producao com seguranca e limpar o metadado de ultima sincronizacao da feature.

## Label exibida no select da producao

O select do modal deixou de usar a descricao da receita como label principal.

Agora cada opcao mostra:

- `codigo do produto de destino`
- `descricao do produto de destino`

Exemplo conceitual:

- `5691 - FLV MIX MANGA BANANA MAMAO 300G`

## O que nao aparece mais no select

A descricao da receita nao aparece mais na label visivel do select.

Ela continua existindo internamente apenas para:

- manter o vinculo correto do lancamento
- enriquecer a busca quando isso ajudar o operador

Ou seja:

- a escolha visual ficou limpa e operacional
- a semantica interna da receita foi preservada

## Como a busca do select funciona agora

O `Select` compartilhado ganhou busca opcional em overlay.

Na producao, a busca filtra por:

- codigo do produto de destino
- descricao do produto de destino
- descricao da receita como apoio interno de busca

Importante:

- a descricao da receita ajuda a localizar
- mas nao polui a label exibida na lista

## Como o layout do modal foi corrigido

Foram feitos dois ajustes principais:

1. o bloco extra que mostrava o produto produzido abaixo do select foi removido
2. o shell de modal operacional passou a usar `KeyboardAvoidingView + ScrollView`

Com isso:

- o campo `Quantidade Produzida` nao fica mais escondido atras dos botoes
- os botoes `Cancelar` e `OK` deixam de cobrir o input
- o conteudo fica mais seguro no Android quando o teclado abre

## Resumo

Os ajustes desta etapa deixaram a producao mais limpa e mais proxima da operacao:

- uma unica migration consolidada para a feature
- select focado no produto produzido
- busca por codigo e texto
- modal com distribuicao vertical mais segura
