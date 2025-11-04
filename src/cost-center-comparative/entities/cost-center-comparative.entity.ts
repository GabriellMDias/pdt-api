import { ApiProperty } from '@nestjs/swagger';

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

export class CostCenterComparativeEntity implements CostCenterComparative{
    @ApiProperty() costCenterId: number;
    @ApiProperty() departmentVrId1: number;
    @ApiProperty() departmentVrDesc: string;
    @ApiProperty() saleValue: number;
    @ApiProperty() saleValuePastPeriodData: number;
    @ApiProperty() percMA: number;
    @ApiProperty() saleValuePastYearPeriodData: number;
    @ApiProperty() percAA: number;
    @ApiProperty() partLastYear: number;
    @ApiProperty() part: number;
    @ApiProperty() tendencia: number;
}