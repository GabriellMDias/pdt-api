export const concContabCartaoSql = `with tab_parametro_data as (
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
	and conta4 = 2
	and nivel = 5
	and id_situacaocadastro = 1),
conciliacao_valores as ((
select
	tr.id_contacontabilfiscaldebito as id_contacontabilfiscal,
	rc.id_loja,
	ROUND(((rc.valor - coalesce(SUM(rci.valor), 0)) - ((rc.valor - coalesce(SUM(rci.valor), 0)) * (case when ((select conf.taxa from recebivelconfiguracao conf where conf.id_tiporecebivel = rc.id_tiporecebivel and rc.id_loja = conf.id_loja)/ 100) is null then 0 else ((select conf.taxa from recebivelconfiguracao conf where conf.id_tiporecebivel = rc.id_tiporecebivel and rc.id_loja = conf.id_loja)/ 100) end))), 2) as saldofinanceiro_aberto,
	0 as saldofinanceiro_recebido,
	0 as valorsaldocontabil
from
	recebercaixa rc
left join recebercaixaitem rci on
	rci.id_recebercaixa = rc.id
left join tiporecebivel tr on
	tr.id = rc.id_tiporecebivel
where
	rc.dataemissao <= (
	select
		data_final
	from
		tab_parametro_data)
	and rc.id_situacaorecebercaixa = 0
group by
	tr.id_contacontabilfiscaldebito,
	rc.id_loja,
	rc.id)
union all (
select
tr.id_contacontabilfiscaldebito as id_contacontabilfiscal,
rc.id_loja,
0 as saldofinanceiro_aberto,
coalesce (SUM(rci.valortotal) ,
0) as saldofinanceiro_recebido,
0 as valorsaldocontabil
from
recebercaixa rc
left join recebercaixaitem rci on
rci.id_recebercaixa = rc.id
left join tiporecebivel tr on
tr.id = rc.id_tiporecebivel
where
rc.dataemissao <= (
select
	data_final
from
	tab_parametro_data)
and rci.databaixa > (
select
	data_final
from
	tab_parametro_data)
group by
tr.id_contacontabilfiscaldebito,
rc.id_loja)
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
		id = valores.id_contacontabilfiscal) as nome_conta
from
	tab_conciliacao_valores valores		
left join contacontabilfiscal ccf on
	ccf.id = valores.id_contacontabilfiscal
	where valores.id_loja = any($2::integer[])
and (
                            $3::boolean = false
                            OR valores.saldofinanceiro_aberto + valores.saldofinanceiro_recebido - valores.valorsaldocontabil <> 0
                        )
order by
	conta_contabil`