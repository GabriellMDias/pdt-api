export type VendaDiaDViewType = "total" | "diario" | "periodo";

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

export type VendaDiaDRow = VendaDiaDBaseRow | VendaDiaDDiarioRow | VendaDiaDPeriodoRow;

export type GetVendaDiaDParams = {
  storeId: number[] | string[];
  initialDate: string;
  finalDate: string;
  viewType: VendaDiaDViewType;
};
