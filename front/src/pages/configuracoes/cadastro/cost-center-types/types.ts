export type CostCenterTypeItem = {
  costCenterId?: number | null;
  storeId?: number | null;
  percentage?: number | null;
  participation?: boolean | null;
};

export type CostCenterType = {
  id: number;
  description: string;
  id_costcentertype_vr: number;
  codcencus_sankhya?: number | null;
  useParticipationStore: boolean;
  useParticipationCostCenter: boolean;
  verified?: boolean | null;
  costCenterTypeItems: CostCenterTypeItem[];
};

export type UpdateCostCenterTypePayload = {
  costCenterTypeItems: CostCenterTypeItem[];
};
