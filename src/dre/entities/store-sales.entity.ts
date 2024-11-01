import { ApiProperty } from "@nestjs/swagger"

export interface StoreSale {
    storeId: number
    costCenterId: number
    saleValue: number
    costWithoutTax: number
    taxValue: number
}

export default class StoreSalesEntity implements StoreSale {
    @ApiProperty()
    storeId: number;

    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    saleValue: number;

    @ApiProperty()
    costWithoutTax: number;

    @ApiProperty()
    taxValue: number;
}
