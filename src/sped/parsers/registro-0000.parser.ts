import { Registro0000 } from './types';

export function parseRegistro0000(linha: string): Registro0000 {
  const c = linha.split('|');

  return {
    REG: c[1], // "0000"
    COD_VER: c[2],
    COD_FIN: c[3],
    DT_INI: c[4],
    DT_FIN: c[5],
    NOME: c[6],
    CNPJ: c[7],
    CPF: c[8],
    UF: c[9],
    IE: c[10],
    COD_MUN: c[11],
    IM: c[12],
    SUFRAMA: c[13],
    IND_PERFIL: c[14],
    IND_ATIV: c[15]
  };
}
