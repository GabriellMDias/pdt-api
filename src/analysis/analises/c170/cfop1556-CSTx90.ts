import { RegistroC170 } from '../../parsers/types';

export const Cfop1556CSTx90 = {
  code: 'CFOP1556_CSTx90',
  description: 'Uso e Consumo - CFOP 1.556 CST Diferente de x90',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'cfop', description: 'CFOP', order: 3, dataType: 'string' },
    { name: 'cstICMS', description: 'CST ICMS', order: 4, dataType: 'string' },
    { name: 'erro', description: 'Erro', order: 5, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1556 → CST_ICMS deve ser igual a 090
        if (item.CFOP === '1556') {

          if (item.CST_ICMS !== '090') {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              cfop: item.CFOP,
              cstICMS: item.CST_ICMS,
              erro: `CFOP 1556 exige CST = 090, mas encontrado ${item.CST_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
