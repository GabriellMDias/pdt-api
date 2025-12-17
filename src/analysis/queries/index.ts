import { concContabAplicacaoSql } from "./conc_contab_aplicacao.sql";
import { concContabBancoContabilSql } from "./conc_contab_banco_contabil.sql";
import { concContabBancoSql } from "./conc_contab_banco.sql";
import { concContabCaixaSql } from "./conc_contab_caixa.sql";
import { concContabCartaoSql } from "./conc_contab_cartao.sql";
import { concContabContaTransioriaZeradaSql } from "./conc_contab_conta_transitoria_zerada.sql";
import { concContabContasZeradasSql } from "./conc_contab_contas_zeradas.sql";
import { concContabConvenioSql } from "./conc_contab_convenio.sql";
import { concContabCreditoRotativoSql } from "./conc_contab_credito_rotativo.sql";
import { concContabDevolucaoSql } from "./conc_contab_devolucao.sql";
import { concContabEscritaValorContabilSql } from "./conc_contab_escrita_valor_contabil.sql";
import { concContabEstoqueSql } from "./conc_contab_estoque.sql";
import { concContabFornecedorServicoSql } from "./conc_contab_fornecedor_servico.sql";
import { concContabFornecedorSql } from "./conc_contab_fornecedor.sql";
import { concContabOutrasContasPagarSql } from "./conc_contab_outras_contas_pagar.sql";
import { concContabOutrasVendaPrazoSql } from "./conc_contab_outras_venda_prazo.sql";

export const AccountingReconcQueries: Record<string, string> = {
  conc_contab_aplicacao: concContabAplicacaoSql,
  conc_contab_banco_contabil: concContabBancoContabilSql,
  conc_contab_banco: concContabBancoSql,
  conc_contab_caixa: concContabCaixaSql,
  conc_contab_cartao: concContabCartaoSql,
  conc_contab_conta_transitoria_zerada: concContabContaTransioriaZeradaSql,
  conc_contab_contas_zeradas: concContabContasZeradasSql,
  conc_contab_convenio: concContabConvenioSql,
  conc_contab_credito_rotativo: concContabCreditoRotativoSql,
  conc_contab_devolucao: concContabDevolucaoSql,
  conc_contab_escrita_valor_contabil: concContabEscritaValorContabilSql,
  conc_contab_estoque: concContabEstoqueSql,
  conc_contab_fornecedor_servico: concContabFornecedorServicoSql,
  conc_contab_fornecedor: concContabFornecedorSql,
  conc_contab_outras_contas_pagar: concContabOutrasContasPagarSql,
  conc_contab_venda_prazo: concContabOutrasVendaPrazoSql
};
