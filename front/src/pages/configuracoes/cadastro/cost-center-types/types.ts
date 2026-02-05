export type CostCenterTypeItem = {
  costCenterId?: number | null;
  storeId?: number | null;
  percentage?: number | null;
  participation?: boolean | null;
};

export type CostCenterType = {
  id: number;
  description: string;
  activeStatus?: boolean | null;
  id_costcentertype_vr: number;
  codcencus_sankhya?: number | null;
  useParticipationStore: boolean;
  useParticipationCostCenter: boolean;
  verified?: boolean | null;
  costCenterTypeItems: CostCenterTypeItem[];
};

export type UpdateCostCenterTypePayload = {
  activeStatus?: boolean | null;
  useParticipationCostCenter?: boolean;
  useParticipationStore?: boolean;
  costCenterTypeItems: CostCenterTypeItem[];
};

export type CreateCostCenterTypePayload = {
  description: string;
  activeStatus?: boolean | null;
  useParticipationStore: boolean;
  useParticipationCostCenter: boolean;
  verified?: boolean | null;
  costCenterTypeItems: CostCenterTypeItem[];
};
