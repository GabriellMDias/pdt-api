import { Registro0200, RegistroC170 } from '../../parsers/types';

export const CfopMPRevCSTx02090 = {
  code: 'CFOPMPRev_CSTx02090',
  description: 'Materia-Prima/Revenda-CFOP 1101,2101,1102,2102- CST Diferente x00, x20 ou x90',
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
        // Regra: se CFOP = 1101, 2101, 1102 ou 2102 → CST_ICMS deve ser igual a 000, 020 ou 090
        if (item.CFOP === '1101' || item.CFOP === '2101' || item.CFOP === '1102' || item.CFOP === '2102') {

          if (item.CST_ICMS !== '000' && item.CST_ICMS !== '020' && item.CST_ICMS !== '090') {
            const cad = itens0200.get(item.COD_ITEM);
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              descrItem: cad.DESCR_ITEM,
              cfop: item.CFOP,
              cstICMS: item.CST_ICMS,
              erro: `CFOP ${item.CFOP} exige CST = 000, 020 ou 090, mas encontrado ${item.CST_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
