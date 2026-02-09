import { ApiProperty } from "@nestjs/swagger";

export interface CostCenterSale {
  costCenterId: number;
  saleValue: number;
  costWithoutTax: number;
  taxValue: number;
}

export default class CostCenterSaleEntity implements CostCenterSale {
  @ApiProperty() costCenterId: number;
  @ApiProperty() saleValue: number;
  @ApiProperty() costWithoutTax: number;
  @ApiProperty() taxValue: number;
}
