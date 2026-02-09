import { RegistroC170, Registro0200 } from '../../parsers/types';

export const CfopMPTipoItem0102 = {
  code: 'CfopMPTipoItem0102',
  description: 'Materia-Prima - CFOP 1.101, 1.401, 2.101, 2.401 x Tipo Item Diferente 01/ 02',
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
        // Regra: se CFOP = 1101, 1401, 2101 ou 2401 → TIPO_ITEM deve ser 1 ou 2
        if (item.CFOP === '1101' || item.CFOP === '1401' || item.CFOP === '2101' || item.CFOP === '2401') {
          const cad = itens0200.get(item.COD_ITEM);

          if (cad.TIPO_ITEM !== '01' && cad.TIPO_ITEM !== '02') {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              descrItem: cad.DESCR_ITEM,
              cfop: item.CFOP,
              tipoItem: cad.TIPO_ITEM,
              erro: `CFOP ${item.CFOP} exige Tipo Item = 01 ou 02, mas encontrado ${cad.TIPO_ITEM}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
