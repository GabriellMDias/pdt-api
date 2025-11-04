export interface CostCenterSale {
    costCenterId: number;
    departmentVrId1: number;
    departmentVrDesc: string;
    saleValue: number;
}

export interface CostCenterComparative extends CostCenterSale{
    saleValuePastPeriodData: number,
    percMA: number,
    saleValuePastYearPeriodData: number,
    percAA: number,
    partLastYear: number,
    part: number,
    tendencia: number
}

export interface SummedUpCostCenterComparative{
  costCenterId: number
  summedUpSaleValue: number
  summedUpSaleValuePastPeriodData: number
  summedUpPercMA: number
  summedUpSaleValuePastYearPeriodData: number
  summedUpPercAA: number
  summedUpPartLastYear: number
  summedUpPart: number
  summedUpTendencia: number
}

export type CompareMode = 'range' | 'month'

export type GetCostCenterComparativeParams = {
    storeId: number[] | string[],
    initialDate: string, //YYYY-MM-DD
    finalDate: string, //YYYY-MM-DD
    mode: CompareMode
}