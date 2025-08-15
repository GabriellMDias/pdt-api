export interface Registro0000 {
  REG: string; // "0000"
  COD_VER: string;
  COD_FIN: string;
  DT_INI: string;
  DT_FIN: string;
  NOME: string;
  CNPJ: string;
  CPF: string;
  UF: string;
  IE: string;
  COD_MUN: string;
  IM: string;
  SUFRAMA: string;
  IND_PERFIL: string;
  IND_ATIV: string
}

export interface Registro0200 {
  REG: string; // "0200"
  COD_ITEM: string;
  DESCR_ITEM: string;
  COD_BARRA: string;
  COD_ANT_ITEM: string;
  UNID_INV: string;
  TIPO_ITEM: string;
  COD_NCM: string;
  EX_IPI: string;
  COD_GEN: string;
  COD_LST: string;
  ALIQ_ICMS: number
}

export interface RegistroC100 {
  REG: string; // "C100"
  IND_OPER: string;
  IND_EMIT: string;
  COD_PART: string;
  COD_MOD: string;
  COD_SIT: string;
  SER: string;
  NUM_DOC: string;
  CHV_NFE: string;
  DT_DOC: string;
  DT_E_S: string;
  VL_DOC: number;
  IND_PGTO: string;
  VL_DESC: number;
  VL_ABAT_NT: number;
  VL_MERC: number;
  IND_FRT: string;
  VL_FRT: number;
  VL_SEG: number;
  VL_OUT_DA: number;
  VL_BC_ICMS: number;
  VL_ICMS: number;
  VL_BC_ICMS_ST: number;
  VL_ICMS_ST: number;
  VL_IPI: number;
  VL_PIS: number;
  VL_COFINS: number;
  VL_PIS_ST: number;
  VL_COFINS_ST: number;
}


export interface RegistroC170 {
  chave: string, // Adicionado, não tem no registro
  REG: string; // "C170"
  NUM_ITEM: string;
  COD_ITEM: string;
  DESCR_COMPL: string;
  QTD: number;
  UNID: string;
  VL_ITEM: number;
  VL_DESC: number;
  IND_MOV: string;
  CST_ICMS: string;
  CFOP: string;
  COD_NAT: string;
  VL_BC_ICMS: number;
  ALIQ_ICMS: number;
  VL_ICMS: number;
  VL_BC_ICMS_ST: number;
  ALIQ_ST: number;
  VL_ICMS_ST: number;
  IND_APUR: string;
  CST_IPI: string;
  COD_ENQ: string;
  VL_BC_IPI: number;
  ALIQ_IPI: number;
  VL_IPI: number;
  CST_PIS: string;
  VL_BC_PIS: number;
  ALIQ_PIS_PERCENTUAL: number;
  QUANT_BC_PIS: number;
  ALIQ_PIS_REAIS: number;
  VL_PIS: number;
  CST_COFINS: string;
  VL_BC_COFINS: number;
  ALIQ_COFINS_PERCENTUAL: number;
  QUANT_BC_COFINS: number;
  ALIQ_COFINS_REAIS: number;
  VL_COFINS: number;
  COD_CTA: string;
}

export interface RegistroC190 {
  chave: string, // Adicionado, não tem no registro
  REG: string; // "C190"
  CST_ICMS: number;
  CFOP: string;
  ALIQ_ICMS: number;
  VL_OPR: number;
  VL_BC_ICMS: number;
  VL_ICMS: number;
  VL_BC_ICMS_ST: number;
  VL_ICMS_ST: number;
  VL_RED_BC: number;
  VL_IPI: number;
  COD_OBS: string;
}

