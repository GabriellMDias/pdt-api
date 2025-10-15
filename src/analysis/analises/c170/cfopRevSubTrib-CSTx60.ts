import { Registro0200, RegistroC170 } from '../../parsers/types';

export const CfopRevSubTribCSTx60 = {
  code: 'CFOPRevSubTrib_CSTx60',
  description: 'Revenda com Sub. Tributaria - CFOP 1.403, 2.403 - CST Diferente de x60',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'descrItem', description: 'Descrição', order: 3, dataType: 'string'},
    { name: 'cfop', description: 'CFOP', order: 3, dataType: 'string' },
    { name: 'cstICMS', description: 'CST ICMS', order: 4, dataType: 'string' },
    { name: 'erro', description: 'Erro', order: 5, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1403 ou 2403 → CST_ICMS deve ser igual a 060
        if (item.CFOP === '1403' || item.CFOP === '2403') {

          if (item.CST_ICMS !== '060') {
            const cad = itens0200.get(item.COD_ITEM);
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              descrItem: cad.DESCR_ITEM,
              cfop: item.CFOP,
              cstICMS: item.CST_ICMS,
              erro: `CFOP ${item.CFOP} exige CST = 060, mas encontrado ${item.CST_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
