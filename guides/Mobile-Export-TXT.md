# Mobile Export TXT

## Como funcionava no legado

No app antigo, a exportacao TXT ficava nas telas de transmissao por meio do componente compartilhado `ExportTxtData`.

Comportamento observado no legado:

- havia um icone de exportacao no topo da tela
- o arquivo era salvo pelo Android usando `StorageAccessFramework`
- o conteudo era `JSON.stringify(data, null, 2)` salvo como `.txt`
- o nome do arquivo seguia o padrao:
  - `<rotina> (dd-mm-aaaa).txt`

Pontos encontrados no legado:

- `ruptura`: `app/administrativo/ruptura/transmissionScreen.tsx`
- `troca`: `app/estoque/troca/transmissionScreen.tsx`
- `consumo`: `app/estoque/consumo/transmissionScreen.tsx`
- `producao`: `app/estoque/producao/transmissionScreen.tsx`
- `balanco`: `app/estoque/balanco/[idBalanco].tsx`

Observacao importante:

- no balanco antigo, a exportacao estava na tela de itens do balanco, nao na tela agrupada por balanco

## Como ficou no app novo

Foi criada uma infraestrutura compartilhada para exportacao TXT em:

- `src/features/shared/operational-export/services/operational-txt-export.service.ts`

Ela centraliza:

- busca completa dos registros locais da rotina
- montagem do nome do arquivo
- serializacao do conteudo em TXT
- salvamento do arquivo no Android via `StorageAccessFramework`
- formatacao consistente por rotina

O botao foi integrado ao header operacional compartilhado:

- `src/features/shared/operational-entry/components/transmission-header.tsx`

## Rotinas suportadas

- ruptura
- troca
- consumo
- producao
- balanco

## Em quais telas o botao aparece

- `ruptura`: tela principal de listagem/transmissao
- `troca`: tela principal de listagem/transmissao
- `consumo`: tela principal de listagem/transmissao
- `producao`: tela principal de listagem/transmissao
- `balanco`: tela de itens do balanco selecionado

## Formato do conteudo

O arquivo continua seguindo a ideia do legado:

- texto `.txt`
- conteudo em JSON identado
- dados reais da rotina, prontos para contingencia

No app novo, cada exportacao busca todos os registros locais do escopo da rotina, nao apenas a pagina atualmente renderizada na lista. Isso foi necessario porque as listas novas sao paginadas/virtualizadas.

Agora o TXT sai com uma estrutura mais util operacionalmente:

- cabecalho com rotina, loja, horario da exportacao e total de registros
- resumo por status local de sincronizacao
- lista `registros` com campos ordenados e nomes consistentes

Estrutura geral:

```json
{
  "tipoArquivo": "pdt-connect-export",
  "versaoFormato": 2,
  "rotina": "Troca",
  "rotinaChave": "troca",
  "exportadoEm": "2026-03-24T12:34:56.000Z",
  "escopo": {
    "lojaId": 1
  },
  "totalRegistros": 10,
  "resumoStatus": {
    "pendente": 8,
    "enviando": 0,
    "transmitido": 2,
    "erro_temporario": 0,
    "erro_permanente": 0
  },
  "registros": []
}
```

Conteudo exportado por rotina:

- `ruptura`: registros de `LocalRuptureEntry`
- `troca`: registros de `LocalTrocaEntry`
- `consumo`: registros de `LocalConsumoEntry`
- `producao`: registros de `LocalProducaoEntry`
- `balanco`: registros de `LocalBalancoEntry` do balanco selecionado

Esses registros incluem os campos operacionais e de sincronizacao locais, como:

- identificadores
- produto
- descricao
- codigo de barras
- quantidade
- motivo/receita/balanco quando aplicavel
- datas
- status de transmissao
- ultimo erro local, quando existir

Campos priorizados por rotina:

- `ruptura`: prateleira, produto, descricao, codigo de barras
- `troca`: motivo, produto, descricao, codigo de barras, tipo de movimento, quantidade
- `consumo`: tipo de consumo, produto, descricao, codigo de barras, tipo de movimento, quantidade
- `producao`: receita, produto, quantidade produzida
- `balanco`: balanco, estoque, produto, descricao, codigo de barras, tipo de movimento, quantidade

## Como o nome do arquivo e gerado

O nome agora ficou mais util para contingencia, incluindo prefixo do app, rotina, loja e timestamp.

Padroes:

- `pdt-connect-rupture-loja-<storeId>-yyyy-mm-dd_hh-mm-ss.txt`
- `pdt-connect-troca-loja-<storeId>-yyyy-mm-dd_hh-mm-ss.txt`
- `pdt-connect-consumo-loja-<storeId>-yyyy-mm-dd_hh-mm-ss.txt`
- `pdt-connect-producao-loja-<storeId>-yyyy-mm-dd_hh-mm-ss.txt`
- `pdt-connect-balanco-loja-<storeId>-balanco-<balanceId>-yyyy-mm-dd_hh-mm-ss.txt`

## Como o usuario exporta

1. Abrir a tela de listagem/transmissao da rotina.
2. Tocar no icone de exportacao ao lado do botao `Transmitir`.
3. Autorizar a pasta no Android.
4. O app salva o arquivo `.txt` na pasta escolhida.

## Diferencas em relacao ao legado

- o mecanismo continua sendo Android `StorageAccessFramework`, como no legado
- o conteudo continua em JSON identado salvo como `.txt`
- o nome do arquivo ficou mais informativo
- o cabecalho e os registros agora sao mais organizados para leitura manual
- no app novo a exportacao busca o conjunto completo do escopo da rotina, nao so a pagina carregada

## Limitacoes

- o fluxo foi pensado para Android, que e a plataforma operacional desta contingencia
- a exportacao do balanco continua focada na tela de itens do balanco, seguindo o comportamento antigo
- o arquivo e salvo localmente; ele nao e enviado automaticamente para backend ou web
