import { parseDecimal } from '../utils/parse-decimal';
import { RegistroC190 } from './types';

export function parseRegistroC190(linha: string, chave: string): RegistroC190 {
  const c = linha.split('|');

  if(chave === '35250760037058000301550010036678971665799538'){
    console.log(`${chave} - ${parseDecimal(c[7])}`)
  }
  

  return {
    chave,
    REG: c[1], // "C190"
    CST_ICMS: parseDecimal(c[2]),
    CFOP: c[3],
    ALIQ_ICMS: parseDecimal(c[4]),
    VL_OPR: parseDecimal(c[5]),
    VL_BC_ICMS: parseDecimal(c[6]),
    VL_ICMS: parseDecimal(c[7]),
    VL_BC_ICMS_ST: parseDecimal(c[8]),
    VL_ICMS_ST: parseDecimal(c[9]),
    VL_RED_BC: parseDecimal(c[10]),
    VL_IPI: parseDecimal(c[11]),
    COD_OBS: c[12],
  };
}
