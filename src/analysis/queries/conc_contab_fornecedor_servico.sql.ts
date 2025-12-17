export const concContabFornecedorServicoSql = `with tab_parametro_data as (
select
	cast ($1 as DATE) as data_final),
tab_conta_conciliar as (
select
	id as conta
from
	contacontabilfiscal
where
	conta1 = 2
	and conta2 = 1
	and conta3 = 1
	and conta4 = 4
	and nivel = 5
	and id_situacaocadastro = 1),
conciliacao_banco as ( (
select
	f.id_contacontabilfiscalpassivo as id_contacontabilfiscal,
	p.id_loja,
	coalesce(SUM(pp.valor) - coalesce(SUM(pa.valor), 0), 0) as saldofinanceiro,
	0 as valorsaldocontabil
from
	fornecedor f
join pagarfornecedor p on
	p.id_fornecedor = f.id
left join pagarfornecedorparcela pp on
	p.id = pp.id_pagarfornecedor
left join pagarfornecedorparcelaabatimento pa on
	pa.id_pagarfornecedorparcela = pp.id
	and pa.id_tipoabatimento = 3
where
	f.id_contacontabilfiscalpassivo in (
	select
		conta
	from
		tab_conta_conciliar)
	and (p.dataentrada <= (
	select
		data_final
	from
		tab_parametro_data)
	and (pp.datapagamento > (
	select
		data_final
	from
		tab_parametro_data)
	or pp.datapagamento is null))
group by
	f.id_contacontabilfiscalpassivo,
	p.id_loja)
union all (
select
cl.id_contacontabilfiscal,
c.id_loja,
0 as saldofinanceiro,
SUM(-cl.valordebito) + SUM(cl.valorcredito) as valorsaldocontabil
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
c.id_loja)),
tab_conciliacao_banco as (
select
	cl.id_contacontabilfiscal,
	cl.id_loja,
	SUM(cl.saldofinanceiro) as saldofinanceiro,
	SUM(cl.valorsaldocontabil) as valorsaldocontabil,
	SUM(cl.saldofinanceiro - cl.valorsaldocontabil) as comparativo
from
	conciliacao_banco cl
left join contacontabilfiscal ccf on
	ccf.id = cl.id_contacontabilfiscal
group by
	cl.id_contacontabilfiscal,
	cl.id_loja)
select
	ccf.conta1 || '.' || ccf.conta2 || '.' || LPAD(cast(ccf.conta3 as VARCHAR), 2, '0') || '.' || LPAD(cast(ccf.conta4 as VARCHAR), 2, '0') || '.' || LPAD(cast(ccf.conta5 as VARCHAR), 5, '0') as mascara,
	valores.id_contacontabilfiscal as conta_contabil,
	valores.id_loja as idloja,
	valores.valorsaldocontabil as saldo_contabil,
	case
		when valores.saldofinanceiro is null then 0.00
		else valores.saldofinanceiro
	end as saldo_financeiro,
	case
		when valores.saldofinanceiro - valores.valorsaldocontabil is null then 0.00
		else valores.saldofinanceiro - valores.valorsaldocontabil
	end as comparativo,
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
	ccf.descricao as nome_conta
from
	tab_conciliacao_banco valores
left join contacontabilfiscal ccf on
	ccf.id = valores.id_contacontabilfiscal
where valores.id_loja = any($2::int[])
and (
                            $3::boolean = false
                            OR valores.saldofinanceiro - valores.valorsaldocontabil <> 0
                        )
order by
	conta_contabil`