import { parseDecimal } from '../utils/parse-decimal';
import { RegistroC100 } from './types';

export function parseRegistroC100(linha: string): RegistroC100 {
  const c = linha.split('|');

  return {
    REG: c[1],
    IND_OPER: c[2],
    IND_EMIT: c[3],
    COD_PART: c[4],
    COD_MOD: c[5],
    COD_SIT: c[6],
    SER: c[7],
    NUM_DOC: c[8],
    CHV_NFE: c[9],
    DT_DOC: c[10],
    DT_E_S: c[11],
    VL_DOC: parseDecimal(c[12]) || 0,
    IND_PGTO: c[13],
    VL_DESC: parseDecimal(c[14]) || 0,
    VL_ABAT_NT: parseDecimal(c[15]) || 0,
    VL_MERC: parseDecimal(c[16]) || 0,
    IND_FRT: c[17],
    VL_FRT: parseDecimal(c[18]) || 0,
    VL_SEG: parseDecimal(c[19]) || 0,
    VL_OUT_DA: parseDecimal(c[20]) || 0,
    VL_BC_ICMS: parseDecimal(c[21]) || 0,
    VL_ICMS: parseDecimal(c[22]) || 0,
    VL_BC_ICMS_ST: parseDecimal(c[23]) || 0,
    VL_ICMS_ST: parseDecimal(c[24]) || 0,
    VL_IPI: parseDecimal(c[25]) || 0,
    VL_PIS: parseDecimal(c[26]) || 0,
    VL_COFINS: parseDecimal(c[27]) || 0,
    VL_PIS_ST: parseDecimal(c[28]) || 0,
    VL_COFINS_ST: parseDecimal(c[29]) || 0,
  };
}
