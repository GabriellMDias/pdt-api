# Mobile Producao - Custo Medio Sem Imposto

## Problema conceitual

Na producao, o `customediocomimposto` do produto produzido ja estava correto porque vinha da soma do custo com imposto dos itens de origem da receita.

O erro estava no `customediosemimposto`: a rotina herdada do legado somava o `customediosemimposto` dos itens de origem e dividia pela quantidade produzida. Isso fazia o custo liquido do item produzido nascer a partir da tributacao dos insumos, quando o correto e usar a tributacao do proprio produto produzido.

## Formula antiga incorreta

Na pratica, a rotina fazia:

```text
customediosemimposto_produzido =
  soma(customediosemimposto_dos_itens_de_origem_utilizado) / quantidade_produzida
```

Essa formula esta conceitualmente errada para o produto final.

## Formula nova correta

Agora a producao faz:

```text
customediocomimposto_produzido =
  soma(customediocomimposto_dos_itens_de_origem_utilizado) / quantidade_produzida

customediosemimposto_produzido =
  ROUND(
    customediocomimposto_produzido *
    (100 - (valorpis + valorcofins) - porcentagemfinal) / 100,
    3
  )
```

## Tabelas tributarias usadas no calculo

- `produto.id_tipopiscofins -> tipopiscofins.valorpis + tipopiscofins.valorcofins`
- `produtoaliquota.id_aliquotaconsumidor -> aliquota.porcentagemfinal`

Os tributos usados para descontar o custo sao sempre os do produto produzido.

## Onde a correcao foi aplicada

- Formula compartilhada: `apps/api/src/stock-movement/stock-movement-formulas.ts`
- Uso na producao: `apps/api/src/adm/producao/producao.service.ts`

## Tratamento de ausencia de configuracao tributaria

Se o produto produzido nao tiver:

- `tipopiscofins` valido para obter `valorpis + valorcofins`
- `id_aliquotaconsumidor` valido para obter `aliquota.porcentagemfinal`

a rotina falha com erro explicito e nao grava um `customediosemimposto` incorreto.

## Como validar

1. Execute uma producao para um produto com configuracao tributaria completa.
2. Rode o relatorio abaixo para a loja e o produto produzidos.
3. O produto nao deve mais aparecer por diferenca entre o `customediosemimposto` gravado e o calculado pela formula correta.

```sql
select 
	pc.id_loja,
	pa.id_produto,
	p.descricaocompleta,
	replace(to_char(a.porcentagemfinal, 'FM9999999990D00'), '.', ',') as icms_consumidor,
	replace(to_char(t.valorpis + t.valorcofins, 'FM9999999990D00'), '.', ',') as piscofins,
	replace(to_char(pc.customediosemimposto, 'FM9999999990D00'), '.', ',') as customediosemimposto_atual,
	replace(to_char(ROUND(pc.customediocomimposto * (100 - (t.valorpis + t.valorcofins) - a.porcentagemfinal) / 100, 3), 'FM9999999990D00'), '.', ',') as customediosemimposto_correto,
	replace(to_char(pc.customediocomimposto, 'FM9999999990D00'), '.', ',') as customediocomimposto_atual,
	replace(to_char(ROUND(pc.customediosemimposto / (1 - (t.valorpis + t.valorcofins)/100 - a.porcentagemfinal/100), 3), 'FM9999999990D00'), '.', ',') as pmz_atual,
	replace(to_char(ROUND(pc.customediocomimposto - (pc.customediosemimposto / (1 - (t.valorpis + t.valorcofins)/100 - a.porcentagemfinal/100)), 2), 'FM9999999990D00'), '.', ',') as diferenca
from produtoaliquota pa
join aliquota a on a.id = pa.id_aliquotaconsumidor
join produto p on p.id = pa.id_produto 
join tipopiscofins t on t.id = p.id_tipopiscofins
join produtocomplemento pc on pc.id_produto = p.id
where pc.id_loja in (1, 5)
and ROUND((pc.customediocomimposto * (100 - (t.valorpis + t.valorcofins) - a.porcentagemfinal) / 100) - pc.customediosemimposto, 3) <> 0
and pc.id_situacaocadastro = 1;
```
