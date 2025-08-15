import { RegistroC170 } from '../../parsers/types';

export const Cfop1551CSTx90 = {
  code: 'CFOP1551_CSTx90',
  description: 'Uso e Consumo - CFOP 1.551 CST Diferente de x90',
  groupName: 'C170',

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1551 → CST_ICMS deve ser igual a 090
        if (item.CFOP === '1551') {

          if (item.CST_ICMS !== '090') {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              cfop: item.CFOP,
              cstICMS: item.CST_ICMS,
              erro: `CFOP 1551 exige CST = 090, mas encontrado ${item.CST_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
