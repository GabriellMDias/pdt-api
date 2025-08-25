import { RegistroC170 } from '../../parsers/types';

export const CfopMPSubTribCSTx60 = {
  code: 'CFOPMPSubTrib_CSTx60',
  description: 'Materia Prima com Sub. Tributaria - CFOP 1.401, 2.401 - CST Diferente de x60',
  groupName: 'C170',

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1401 ou 2401 → CST_ICMS deve ser igual a 060
        if (item.CFOP === '1401' || item.CFOP === '2401') {

          if (item.CST_ICMS !== '060') {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
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
