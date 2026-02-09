import { Registro0400 } from './types';

export function parseRegistro0400(linha: string): Registro0400 {
  const c = linha.split('|');

  return {
    REG: c[1], // "0400"
    COD_NAT: c[2],
    DESCR_NAT: c[3]
  };
}
