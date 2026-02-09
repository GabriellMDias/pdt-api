export const concContabEstoqueSql = `with tab_parametro_data as (
select
	cast ($1 as DATE) as data_final),
tab_conta_conciliar as (
select
	id as conta
from
	contacontabilfiscal
where
	conta1 = 1
	and conta2 = 1
	and conta3 = 5
	and conta4 = 1
	and nivel = 5
	and id_situacaocadastro = 1),
saldo_inventario as (
select
	l.id as id_loja,
	data,
	l.descricao as LOJA,
	i.id_produto as codigoProduto,
	p.descricaocompleta as descricao_produto,
	i.quantidade as QUANTIDADE,
	i.customediosemimposto as custo_contabil,
	(i.quantidade * i.customediosemimposto) as custo_contabil_Total
from
	inventario i
left join loja l on
	i.id_loja = l.id
left join produto p on
	i.id_produto = p.id
left join produtocomplemento pc on
	p.id = pc.id_produto
	and i.id_loja = pc.id_loja
where
	pc.id_tipoproduto not in (7, 8, 9, 99)
		and i.quantidade > 0
		and data = (
		select
			data_final
		from
			tab_parametro_data)),
saldo_contabil as (
select
	cl.id_contacontabilfiscal,
	c.id_loja,
	SUM(cl.valordebito) + SUM(-cl.valorcredito) as valorsaldocontabil
from
	contabilidadelancamento cl
left join contabilidade c on
	c.id = cl.id_contabilidade
where
	cl.id_contacontabilfiscal in (
	select
		conta
	from
		tab_conta_conciliar)
	and c.data <=(
	select
		data_final
	from
		tab_parametro_data)
group by
	cl.id_contacontabilfiscal,
	c.id_loja),
conciliacao_valores as ( (
select
	(
	select
		id as conta
	from
		contacontabilfiscal
	where
		conta1 = 1
		and conta2 = 1
		and conta3 = 5
		and conta4 = 1
		and conta5 = 1) as id_contacontabilfiscal,
	id_loja,
	ROUND(SUM(custo_contabil_Total), 2) as valor_inventario_fiscal,
	0 as valorsaldocontabil
from
	saldo_inventario
group by
	id_loja)
union all (
select
id_contacontabilfiscal,
id_loja,
0 as valor_inventario_fiscal,
SUM(valorsaldocontabil) as valorsaldocontabil
from
saldo_contabil
group by
id_contacontabilfiscal,
id_loja))
select
	valores.id_contacontabilfiscal as conta_contabil,
	ccf.descricao as nome_conta,
	valores.id_loja as idloja,
	(
	select
		descricao
	from
		loja
	where
		id = valores.id_loja) as loja,
	(
	select
		cnpj
	from
		fornecedor
	where
		id in (
		select
			id_fornecedor
		from
			loja
		where
			id = valores.id_loja)) as cnpj,
	coalesce(SUM(valor_inventario_fiscal) , 0) as inventario_fiscal,
	coalesce(SUM(valorsaldocontabil) , 0) as saldo_contabil,
	coalesce((SUM(valor_inventario_fiscal) - SUM(valorsaldocontabil)), 0) as comparativo
from
	conciliacao_valores valores
left join contacontabilfiscal ccf on
	ccf.id = valores.id_contacontabilfiscal
where valores.id_loja = any($2::int[])
group by
	valores.id_contacontabilfiscal,
	valores.id_loja,
	ccf.descricao
having
    $3::boolean = false
    OR coalesce(
        SUM(valor_inventario_fiscal) - SUM(valorsaldocontabil),
        0
    ) <> 0
order by
	valores.id_loja,
	valores.id_contacontabilfiscal`