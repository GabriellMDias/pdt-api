import { parseDecimal } from '../utils/parse-decimal';
import { Registro0200 } from './types';

export function parseRegistro0200(linha: string): Registro0200 {
  const c = linha.split('|');

  return {
    REG: c[1], // "0000"
    COD_ITEM: c[2],
    DESCR_ITEM: c[3],
    COD_BARRA: c[4],
    COD_ANT_ITEM: c[5],
    UNID_INV: c[6],
    TIPO_ITEM: c[7],
    COD_NCM: c[8],
    EX_IPI: c[9],
    COD_GEN: c[10],
    COD_LST: c[11],
    ALIQ_ICMS: parseDecimal(c[12])
  };
}
