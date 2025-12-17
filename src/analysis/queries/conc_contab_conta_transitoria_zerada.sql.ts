export const concContabContaTransioriaZeradaSql = `with tab_parametro_data as (
select
	cast ($1 as DATE) as data_final),
tab_conta_conciliar as (
select
	id as conta
from
	contacontabilfiscal
where
	descricao like '%TRANS%'
	and conta1 in (1, 2)
	and cast(conta5 as VARCHAR) like '%999%'
	and id_situacaocadastro = 1),
ctb as (
select
	c.id_loja as idloja,
	l.descricao as LOJA,
	ccf.descricao as nome_conta,
	cl.id_contacontabilfiscal as conta_contabil,
	SUM(cl.valordebito) + SUM(-cl.valorcredito) as saldo_contabil,
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
			id = c.id_loja)) as cnpj
from
	contabilidadelancamento cl
left join contabilidade c on
	c.id = cl.id_contabilidade
left join contabilidade.grupoeconomicoloja gel on
	gel.id_loja = c.id_loja
left join contabilidade.grupoeconomico ge on
	ge.id = gel.id_grupoeconomico
left join loja l on
	c.id_loja = l.id
left join contacontabilfiscal ccf on
	ccf.id = cl.id_contacontabilfiscal
where
	cl.id_contacontabilfiscal in (
	select
		conta
	from
		tab_conta_conciliar)
	and c.data <= (
	select
		data_final
	from
		tab_parametro_data)
group by
	c.id_loja,
	l.descricao,
	cl.id_contacontabilfiscal,
	ccf.descricao)
select
	idloja,
	cnpj,
	loja,
	nome_conta as conta_descricao,
	conta_contabil,
	saldo_contabil
from
	ctb
	where ctb.idloja = any($2::integer[])
and (
                            $3::boolean = false
                            OR ctb.saldo_contabil <> 0
                        )
order by
	conta_contabil`