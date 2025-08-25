import { RegistroC170 } from '../../parsers/types';

export const Cfop1556ComCredICMS = {
  code: 'CFOP1556_comCredICMS',
  description: 'Uso e Consumo - CFOP 1.556 com Credito ICMS',
  groupName: 'C170',

  execute(
    notas: Map<string, { c100: any; itens: RegistroC170[] }>,
  ) {
    const erros: any[] = [];

    for (const [chave, nota] of notas.entries()) {
      for (const item of nota.itens) {
        // Regra: se CFOP = 1556 → VL_ICMS deve ser 0
        if (item.CFOP === '1556') {
          if (item.VL_ICMS > 0) {
            erros.push({
              chave,
              numDoc: nota.c100.NUM_DOC,
              codItem: item.COD_ITEM,
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
