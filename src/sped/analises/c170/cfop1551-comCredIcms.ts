import { RegistroC170 } from '../../parsers/types';

export const Cfop1551ComCredICMS = {
  code: 'CFOP1551_comCredICMS',
  description: 'Ativo Imobilizado - CFOP 1.551 - com Credito ICMS',
  groupName: 'C170',

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1551 → VL_ICMS deve ser 0
        if (item.CFOP === '1551') {
          if (item.VL_ICMS > 0) {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
              cfop: item.CFOP,
              valorICMS: item.VL_ICMS,
              erro: `CFOP 1551 não deve ter crédito ICMS. Valor ICMS: ${item.VL_ICMS}`,
            });
          }
        }
      }
    }

    return erros;
  },
};
