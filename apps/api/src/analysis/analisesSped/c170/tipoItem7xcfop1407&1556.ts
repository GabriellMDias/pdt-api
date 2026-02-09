import { RegistroC170, Registro0200 } from '../../parsers/types';

export const TipoItem7Cfop1407e1556 = {
  code: 'TIPOITEM7CFOP1407E1556',
  description: 'Uso e Consumo - Tipo Item = 07 x CFOP diferente de 1.407 ou 1.556',
  groupName: 'C170',
  fields: [
    { name: 'chave', description: 'Chave NFE', order: 0, dataType: 'string' },
    { name: 'numDoc', description: 'Num Doc', order: 1, dataType: 'string' },
    { name: 'codItem', description: 'Cod. Item', order: 2, dataType: 'string' },
    { name: 'descrItem', description: 'Descrição', order: 3, dataType: 'string'},
    { name: 'cfop', description: 'CFOP', order: 4, dataType: 'string' },
    { name: 'tipoItem', description: 'Tipo Item', order: 5, dataType: 'string' },
    { name: 'erro', description: 'Erro', order: 6, dataType: 'string' }
  ],

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
    itens0200: Map<string, Registro0200>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se TIPO_ITEM = 7 → CFOP deve ser 1407 ou 1556
        const cad = itens0200.get(item.COD_ITEM);

        if(cad.TIPO_ITEM === '07' && item.CFOP !== '1407' && item.CFOP !== '1556') {
          erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              descrItem: cad.DESCR_ITEM,
              cfop: item.CFOP,
              tipoItem: cad.TIPO_ITEM,
              erro: `Tipo Item = 07 exige CFOP 1.407 ou 1.556, mas encontrado ${item.CFOP}`,
            });
        }
      }
    }

    return erros;
  },
};
