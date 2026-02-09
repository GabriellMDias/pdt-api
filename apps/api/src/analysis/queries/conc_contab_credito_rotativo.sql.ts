export const concContabCreditoRotativoSql = `with tab_parametro_data as (
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
	and conta3 = 3
	and conta4 = 7
	and nivel = 5
	and id_situacaocadastro = 1),
conciliacao_valores as ( (
select
	e.id_contacontabilfiscalativo as id_contacontabilfiscal,
	rr.id_loja,
	coalesce (ROUND((SUM(rr.valor) - SUM(rri.valor)), 2),
	0) as saldofinanceiro_aberto,
	0 as saldofinanceiro_recebido,
	0 as valorsaldocontabil
from
	recebercreditorotativo rr
inner join recebercreditorotativoitem rri on
	rri.id_recebercreditorotativo = rr.id
left join clientepreferencial e on
	e.id = rr.id_clientepreferencial
where
	rr.id_situacaorecebercreditorotativo = 0
	and rr.dataemissao <= (
	select
		data_final
	from
		tab_parametro_data)
group by
	e.id_contacontabilfiscalativo,
	rr.id_loja)
union all (
select
e.id_contacontabilfiscalativo as id_contacontabilfiscal,
rr.id_loja,
coalesce (ROUND((SUM(rri.valor)), 2),
0) as saldofinanceiro_aberto,
0 as saldofinanceiro_recebido,
0 as valorsaldocontabil
from
recebercreditorotativo rr
inner join recebercreditorotativoitem rri on
rri.id_recebercreditorotativo = rr.id
left join clientepreferencial e on
e.id = rr.id_clientepreferencial
where
rr.id_situacaorecebercreditorotativo = 0
and rr.dataemissao <= (
select
	data_final
from
	tab_parametro_data)
and rri.databaixa > (
select
	data_final
from
	tab_parametro_data)
group by
e.id_contacontabilfiscalativo,
rr.id_loja)
union all (
select
e.id_contacontabilfiscalativo as id_contacontabilfiscal,
rr.id_loja,
coalesce (ROUND((SUM(rr.valor)), 2),
0) as saldofinanceiro_aberto,
0 as saldofinanceiro_recebido,
0 as valorsaldocontabil
from
recebercreditorotativo rr
left join clientepreferencial e on
e.id = rr.id_clientepreferencial
where
rr.id_situacaorecebercreditorotativo = 0
and rr.dataemissao <= (
select
data_final
from
tab_parametro_data)
and rr.id not in (
select
id_recebercreditorotativo
from
recebercreditorotativoitem)
group by
e.id_contacontabilfiscalativo,
rr.id_loja)
union all (
select
e.id_contacontabilfiscalativo as id_contacontabilfiscal,
rr.id_loja,
0 as saldofinanceiro_aberto,
coalesce (SUM(rri.valor) ,
0) as saldofinanceiro_recebido,
0 as valorsaldocontabil
from
recebercreditorotativo rr
inner join recebercreditorotativoitem rri on
rri.id_recebercreditorotativo = rr.id
left join clientepreferencial e on
e.id = rr.id_clientepreferencial
left join contacontabilfiscal ccf on
ccf.id = e.id_contacontabilfiscalativo
where
rr.id_situacaorecebercreditorotativo <> 0
and rr.dataemissao <= (
select
data_final
from
tab_parametro_data)
and rri.databaixa > (
select
data_final
from
tab_parametro_data)
group by
e.id_contacontabilfiscalativo,
rr.id_loja)
union all (
select
cl.id_contacontabilfiscal,
c.id_loja,
0 as saldofinanceiro_aberto,
0 as saldofinanceiro_recebido,
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
c.id_loja)),
tab_conciliacao_valores as (
select
	cl.id_contacontabilfiscal,
	cl.id_loja,
	SUM(cl.saldofinanceiro_aberto) as saldofinanceiro_aberto,
	SUM(cl.saldofinanceiro_recebido) as saldofinanceiro_recebido,
	SUM(cl.valorsaldocontabil) as valorsaldocontabil
from
	conciliacao_valores cl
left join contacontabilfiscal ccf on
	ccf.id = cl.id_contacontabilfiscal
group by
	cl.id_contacontabilfiscal,
	cl.id_loja)
select
	valores.id_contacontabilfiscal as conta_contabil,
	valores.id_loja as idloja,
	valores.valorsaldocontabil as saldo_contabil,
	valores.saldofinanceiro_aberto as saldo_financeiro_aberto,
	valores.saldofinanceiro_recebido as saldo_financeiro_recebido,
	valores.saldofinanceiro_aberto + valores.saldofinanceiro_recebido as financeiro,
	valores.saldofinanceiro_aberto + valores.saldofinanceiro_recebido - valores.valorsaldocontabil as comparativo,
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
	(
	select
		descricao
	from
		contacontabilfiscal
	where
		id = valores.id_contacontabilfiscal) as nome_conta,
	(
	select
		id
	from
		clientepreferencial
	where
		id_contacontabilfiscalativo = valores.id_contacontabilfiscal
	limit 1) as codigo_financeiro
from
	tab_conciliacao_valores valores
left join contacontabilfiscal ccf on
	ccf.id = valores.id_contacontabilfiscal
where valores.id_loja = any($2::int[])
and (
                            $3::boolean = false
                            OR valores.saldofinanceiro_aberto + valores.saldofinanceiro_recebido - valores.valorsaldocontabil <> 0
                        )
order by
	conta_contabil`