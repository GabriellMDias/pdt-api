export type VendaDiaDViewType = "diario" | "mensal" | "periodo" | "total";

export type VendaDiaDBaseRow = {
  qtd_cupom: number;
  qtd_cliente: number;
  total_venda: number;
  total_desconto: number;
};

export type VendaDiaDDiarioRow = VendaDiaDBaseRow & {
  data: string;
};

export type VendaDiaDPeriodoRow = VendaDiaDBaseRow & {
  periodo: string;
};

export type VendaDiaDMensalRow = VendaDiaDBaseRow & {
  mes: string;
};

export type VendaDiaDRow =
  | VendaDiaDBaseRow
  | VendaDiaDDiarioRow
  | VendaDiaDMensalRow
  | VendaDiaDPeriodoRow;

export type GetVendaDiaDParams = {
  storeId: number[] | string[];
  initialDate: string;
  finalDate: string;
  viewType: VendaDiaDViewType;
};
