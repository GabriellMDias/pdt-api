import { Registro0200, RegistroC170 } from '../../parsers/types';

export const Cfop1556ComCredICMS = {
  code: 'CFOP1556_comCredICMS',
  description: 'Uso e Consumo - CFOP 1.556 com Credito ICMS',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'descrItem', description: 'Descrição', order: 3, dataType: 'string'},
    { name: 'cfop', description: 'CFOP', order: 4, dataType: 'string' },
    { name: 'valorICMS', description: 'Vlr ICMS', order: 5, dataType: 'int' },
    { name: 'erro', description: 'Erro', order: 6, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1556 → VL_ICMS deve ser 0
        if (item.CFOP === '1556') {
          if (item.VL_ICMS > 0) {
            const cad = itens0200.get(item.COD_ITEM);
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              descrItem: cad.DESCR_ITEM,
              cfop: item.CFOP,
              valorICMS: item.VL_ICMS,
              erro: `CFOP 1556 não deve ter crédito ICMS. Valor ICMS: ${item.VL_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
