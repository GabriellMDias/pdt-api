import { RegistroC170, Registro0200 } from '../../parsers/types';

export const Cfop1556TipoItem7 = {
  code: 'CFOP1556_TIPOITEM7',
  description: 'Uso e Consumo - CFOP 1.556 x Tipo Item Diferente de 07',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'cfop', description: 'CFOP', order: 3, dataType: 'string' },
    { name: 'tipoItem', description: 'Tipo Item', order: 4, dataType: 'string' },
    { name: 'erro', description: 'Erro', order: 5, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1556 → TIPO_ITEM deve ser 7
        if (item.CFOP === '1556') {
          const cad = itens0200.get(item.COD_ITEM);

          if (cad.TIPO_ITEM !== '07') {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              cfop: item.CFOP,
              tipoItem: cad.TIPO_ITEM,
              erro: `CFOP 1556 exige Tipo Item = 07, mas encontrado ${cad.TIPO_ITEM}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
