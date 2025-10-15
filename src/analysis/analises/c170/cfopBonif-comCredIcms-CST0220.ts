import { Registro0200, RegistroC170 } from '../../parsers/types';

export const CfopBonifComCredICMSCST0220 = {
  code: 'CFOPBonif_comCredICMSCST0220',
  description: 'Entrada de Bonificacao com Credito de ICMS - CST Diferente de x00 ou x20',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'descrItem', description: 'Descrição', order: 3, dataType: 'string'},
    { name: 'cfop', description: 'CFOP', order: 4, dataType: 'string' },
    { name: 'cstICMS', description: 'CST ICMS', order: 5, dataType: 'string' },
    { name: 'erro', description: 'Erro', order: 6, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1910 ou 2910 (Bonificação) → CST_ICMS deve 000 AND 020
        if (item.CFOP === '1910' || item.CFOP === '2910') {
          if (item.VL_ICMS > 0) {
            if (item.CST_ICMS !== '000' && item.CST_ICMS !== '020') {
                const cad = itens0200.get(item.COD_ITEM);
                erros.push({
                chave,
                numDoc: nota.c100.NUM_DOC,
                codItem: item.COD_ITEM,
                descrItem: cad.DESCR_ITEM,
                cfop: item.CFOP,
                cstIcms: item.CST_ICMS,
                erro: `Entrada de Bonificacao com Credito de ICMS com CST Diferente de x00 ou x20`,
              });
            }
          }
        }
      }
    }

    return erros;
  },
};
