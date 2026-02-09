export const concContabEscritaValorContabilSql  = `with tab_parametro_data as (
select
	date_trunc('month', $1::date)::date as data_inicial,
	(date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date as data_final),
tab_conta_conciliar as ((
select
	id as conta
from
	contacontabilfiscal
where
	conta1 in (3, 4, 5)
	and nivel = 5)
union all (
select
id as conta
from
contacontabilfiscal
where
conta1 = 1
and conta2 = 1
and conta3 = 5
and conta4 = 1
and nivel = 5)),
conta_contabil_entrada as (
select
	te.id as tipo_entrada,
	case
		when te.contabilidadepadrao = 't' then (
		select
			id_contacontabildebito
		from
			contabilidade.tipoentrada
		where
			id_tipovalor = 5)
		else id_contacontabildebito
	end as conta_entrada
from
	tipoentrada te
left join tipoentradacontabilidade tec on
	te.id = tec.id_tipoentrada
	and tec.id_tipovalorcontabilidade = 5),
conta_contabil_saida as (
select
	ts.id as tipo_saida,
	case
		when ts.contabilidadepadrao = 't' then (
		select
			id_contacontabilcredito
		from
			contabilidade.tiposaida
		where
			id_tipovalor = 5)
		else id_contacontabilcredito
	end as conta_saida
from
	tiposaida ts
left join tiposaidacontabilidade tsc on
	ts.id = tsc.id_tiposaida
	and tsc.id_tipovalorcontabilidade = 5),
conciliacao_valores as ( (
select
	e.id_loja,
	ei.id_tipoentrada as tipo_entrada,
	null as tipo_saida,
	(
	select
		conta_entrada
	from
		conta_contabil_entrada
	where
		tipo_entrada = ei.id_tipoentrada) as id_contacontabilfiscal,
	SUM(ei.valorbasecalculo + ei.valorisento + ei.valoroutras + ei.valoricmssubstituicao + ei.valoripi + ei.valorfcpst - ei.valoricmsdesonerado + (select coalesce(SUM(neg.valor), 0) from notaentradagnre neg left join notaentrada ne on neg.id_notaentrada = ne.id where ne.dataentrada between (select data_inicial from tab_parametro_data) and (select data_final from tab_parametro_data) and neg.id_tipoentrada = ei.id_tipoentrada and ne.id_loja = e.id_loja)) as valor_fiscal_entrada,
	0 as valor_fiscal_saida
from
	escrita e
left join escritaitem ei on
	e.id = ei.id_escrita
where
	e.data between (
	select
		data_inicial
	from
		tab_parametro_data) and (
	select
		data_final
	from
		tab_parametro_data)
	and e.id_situacaonfe not in (2, 3, 4, 5)
		and e.cancelado = false
		and e.id_tipoentradasaida = 0
	group by
		e.id_loja,
		ei.id_tipoentrada,
		ei.id_tiposaida)
union all (
select
e.id_loja,
null as tipo_entrada,
ei.id_tiposaida as tipo_saida,
(
select
	conta_saida
from
	conta_contabil_saida
where
	tipo_saida = ei.id_tiposaida) as id_contacontabilfiscal,
0 as valor_fiscal_entrada,
SUM(ei.valorbasecalculo + ei.valorisento + ei.valoroutras + ei.valoricmssubstituicao + ei.valoripi + ei.valorfcpst - ei.valoricmsdesonerado) as valor_fiscal_saida
from
escrita e
left join escritaitem ei on
e.id = ei.id_escrita
where
e.data between (
select
	data_inicial
from
	tab_parametro_data) and (
select
	data_final
from
	tab_parametro_data)
and e.id_situacaonfe not in (2, 3, 4, 5)
	and e.cancelado = false
	and e.id_tipoentradasaida = 1
group by
	e.id_loja,
	ei.id_tipoentrada,
	ei.id_tiposaida))
select
	id_loja as idloja,
	id_contacontabilfiscal,
	tipo_entrada,
	te.descricao as descricao_tipo_entrada,
	tipo_saida,
	ts.descricao as descricao_tipo_saida,
	SUM(valor_fiscal_entrada) as valor_fiscal_entrada,
	SUM(valor_fiscal_saida) as valor_fiscal_saida
from
	conciliacao_valores valores
left join tipoentrada te on
	te.id = tipo_entrada
left join tiposaida ts on
	ts.id = tipo_saida
where
	id_contacontabilfiscal is null
	and valores.id_loja = any($2::int[])
and (
                            $3::boolean = false
                            OR $3::boolean = true
                        )
group by
	id_loja,
	id_contacontabilfiscal,
	tipo_entrada,
	tipo_saida,
	te.descricao,
	ts.descricao
order by
	id_loja`