import { parseDecimal } from '../utils/parse-decimal';
import { RegistroC170 } from './types';

export function parseRegistroC170(linha: string, chave: string): RegistroC170 {
  const c = linha.split('|');

  return {
    chave,
    REG: c[1], // "C170"
    NUM_ITEM: c[2],
    COD_ITEM: c[3],
    DESCR_COMPL: c[4],
    QTD: parseDecimal(c[5]),
    UNID: c[6],
    VL_ITEM: parseDecimal(c[7]),
    VL_DESC: parseDecimal(c[8]),
    IND_MOV: c[9],
    CST_ICMS: c[10],
    CFOP: c[11],
    COD_NAT: c[12],
    VL_BC_ICMS: parseDecimal(c[13]),
    ALIQ_ICMS: parseDecimal(c[14]),
    VL_ICMS: parseDecimal(c[15]),
    VL_BC_ICMS_ST: parseDecimal(c[16]),
    ALIQ_ST: parseDecimal(c[17]),
    VL_ICMS_ST: parseDecimal(c[18]),
    IND_APUR: c[19],
    CST_IPI: c[20],
    COD_ENQ: c[21],
    VL_BC_IPI: parseDecimal(c[22]),
    ALIQ_IPI: parseDecimal(c[23]),
    VL_IPI: parseDecimal(c[24]),
    CST_PIS: c[25],
    VL_BC_PIS: parseDecimal(c[26]),
    ALIQ_PIS_PERCENTUAL: parseDecimal(c[27]),
    QUANT_BC_PIS: parseDecimal(c[28]),
    ALIQ_PIS_REAIS: parseDecimal(c[29]),
    VL_PIS: parseDecimal(c[30]),
    CST_COFINS: c[31],
    VL_BC_COFINS: parseDecimal(c[32]),
    ALIQ_COFINS_PERCENTUAL: parseDecimal(c[33]),
    QUANT_BC_COFINS: parseDecimal(c[34]),
    ALIQ_COFINS_REAIS: parseDecimal(c[35]),
    VL_COFINS: parseDecimal(c[36]),
    COD_CTA: c[37]
  };
}
