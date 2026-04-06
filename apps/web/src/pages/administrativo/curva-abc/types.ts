export type CurvaAbcClassificacao = "A" | "B" | "C";

export type CurvaAbcRow = {
  id_produto: number;
  descricao: string;
  quantidade: number;
  venda: number;
  lucro: number;
  mercadologico1: number | null;
  mercadologico1_descricao: string | null;
  mercadologico2: number | null;
  mercadologico2_descricao: string | null;
  curva_abc_volume_mercadologico1: CurvaAbcClassificacao;
  curva_abc_venda_mercadologico1: CurvaAbcClassificacao;
  curva_abc_lucro_mercadologico1: CurvaAbcClassificacao;
  curva_abc_volume_mercadologico2: CurvaAbcClassificacao;
  curva_abc_venda_mercadologico2: CurvaAbcClassificacao;
  curva_abc_lucro_mercadologico2: CurvaAbcClassificacao;
};

export type CurvaAbcMercadologicoPair = {
  mercadologico1: number;
  mercadologico2: number;
};

export type GetCurvaAbcParams = {
  storeId: Array<number | string>;
  initialDate: string;
  finalDate: string;
  mercadologicoPair?: CurvaAbcMercadologicoPair[];
};

export type DepartmentApiItem = {
  id: number;
  description: string;
  costCenterId: number;
  departmentVrId1: number;
  departmentVrId2: number;
  level: number;
};

export type MercadologicoFiltroValor = {
  pares: CurvaAbcMercadologicoPair[];
};

export type MercadologicoNivel2 = {
  id: string;
  code: number;
  description: string;
};

export type MercadologicoNivel1 = {
  id: string;
  code: number;
  description: string;
  children: MercadologicoNivel2[];
};
