# Mobile Producao Ajustes Catalogo e Modal

## Problema corrigido

A producao estava exibindo itens como `5455 - Produto 5455` porque havia um desencaixe entre dois catalogos:

- o catalogo global de produtos do mobile trazia apenas produtos com `produtocomplemento.id_situacaocadastro = 1`
- o catalogo de receitas de producao trazia saidas de receita sem validar se o produto de destino seguia ativo e lancavel na loja atual

Resultado:

- a receita/sua saida chegava ao mobile
- o produto de destino nao existia como item ativo no catalogo local
- a UI montava fallback textual e o lancamento falhava na hora de salvar

## Como produtos excluidos/inativos passaram a ser tratados localmente

O sistema real revisado nesta etapa nao expunha um campo separado de `deleted_at` ou `is_deleted` para o catalogo mobile.

O sinal consistente disponivel no backend atual e:

- `produtocomplemento.id_situacaocadastro`

Por isso, a adaptacao adotada foi:

- o sync de `stock.products` passou a trazer tambem produtos inativos da loja
- esses produtos continuam sendo persistidos localmente em `catalog_products`
- o campo local ja existente `active_status` passou a ser a marcacao explicita de produto lancavel ou nao na loja atual

Em outras palavras:

- produto ativo na loja: `active_status = 1`
- produto inativo/excluido da loja no contexto atual: `active_status = 0`

Limitacao conhecida:

- se um produto deixar de existir completamente para a loja na origem, sem linha correspondente em `produtocomplemento`, o mobile nao recebe um marcador separado de exclusao historica
- nesse caso, a referencia deixa de pertencer ao catalogo da loja atual

## Como a lista de produtos produzidos passou a ser filtrada

Agora a lista de selecao da producao considera simultaneamente:

1. receita ativa
2. receita ativa para a loja atual
3. existencia de pelo menos um produto de destino ativo na loja atual
4. somente produtos de destino ativos entram na lista de saidas da receita

Na pratica:

- o backend de `production.recipes` passou a filtrar receitas por `EXISTS` em `receitaproduto + produtocomplemento ativo`
- as saidas de receita tambem passaram a ser filtradas por produto ativo na loja
- no mobile, a montagem final do select reforca a regra e so cria opcoes quando o produto local existe e esta com `activeStatus = true`

Com isso:

- produtos inativos continuam sincronizados localmente
- mas nao aparecem como opcao lancavel na producao

## Como a validacao da quantidade reage a troca de produto

O modal da producao agora revalida a quantidade quando o produto selecionado muda.

Comportamento adotado:

- se o produto novo aceita decimal, o valor atual pode ser mantido
- se o produto novo nao aceita decimal e o valor atual veio com separador decimal, o campo e limpo
- uma mensagem de aviso e exibida imediatamente orientando a informar uma quantidade inteira

Isso evita que uma quantidade decimal digitada para um produto anterior continue valida ao trocar para um produto inteiro.

## Como o fluxo rapido do modal foi implementado

O comportamento foi aproximado do legado:

1. ao tocar em adicionar, o modal abre e o select ja abre junto
2. o campo de pesquisa do select recebe foco automaticamente
3. ao escolher um produto, a lista fecha
4. o foco vai automaticamente para o campo de quantidade
5. apos salvar com sucesso, a selecao e limpa
6. o select abre novamente e a pesquisa volta a receber foco para o proximo lancamento

Isso foi implementado com:

- `Select` compartilhado aceitando `autoOpenToken`
- fechamento automatico do dropdown quando o modal pai fecha
- foco programatico no campo de quantidade apos a selecao

## Como o modal foi ajustado para funcionar melhor com teclado

O shell compartilhado de modal operacional foi ajustado para:

- observar abertura e fechamento do teclado
- mover o modal para cima quando necessario
- recalcular altura maxima disponivel acima do teclado
- manter scroll interno para o conteudo do modal

Com isso:

- o campo focado continua visivel
- os botoes nao cobrem o input de quantidade
- o modal permanece utilizavel no Android durante digitacao

