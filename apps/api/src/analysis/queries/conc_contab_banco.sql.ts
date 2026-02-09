export const concContabBancoSql = `with tab_parametro_data as (
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
	and conta3 = 1
	and conta4 = 2
	and nivel = 5
	and id_situacaocadastro = 1),
conciliacao_banco as ( (
select
	bc.id_contacontabilfiscal,
	bc.id_loja,
	coalesce ((SUM(-bl.valordebito)) + (SUM(bl.valorcredito)),
	0) as saldofinanceiro,
	0 as valorsaldocontabil
from
	conciliacaobancarialancamento bl
left join conciliacaobancaria b on
	b.id = bl.id_conciliacaobancaria
left join bancoconta bc on
	bc.conta = b.conta
	and bc.agencia = b.agencia
	and bc.id_banco = b.id_banco
where
	bc.id_contacontabilfiscal in (
	select
		conta
	from
		tab_conta_conciliar)
	and b.data <= (
	select
		data_final
	from
		tab_parametro_data)
group by
	bc.id_contacontabilfiscal,
	bc.id_loja)
union all (
select
cl.id_contacontabilfiscal,
c.id_loja,
0 as saldofinanceiro,
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
	valores.id_contacontabilfiscal as conta_contabil,
	valores.valorsaldocontabil as saldo_contabil,
	case
		when valores.saldofinanceiro is null then 0.00
		else valores.saldofinanceiro
	end as saldo_financeiro,
	case
		when valores.saldofinanceiro - valores.valorsaldocontabil is null then 0.00
		else valores.saldofinanceiro - valores.valorsaldocontabil
	end as comparativo,
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
	(
	select
		descricao
	from
		contacontabilfiscal
	where
		id = valores.id_contacontabilfiscal) as nome_conta
from
	tab_conciliacao_banco valores
where valores.id_loja = any($2::integer[])
and (
                            $3::boolean = false
                            OR valores.saldofinanceiro - valores.valorsaldocontabil <> 0
                        )
order by
	conta_contabil`