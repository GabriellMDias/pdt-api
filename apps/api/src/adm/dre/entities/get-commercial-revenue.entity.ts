import { ApiProperty } from "@nestjs/swagger"

export interface CommercialRevenue {
    costCenterId: number
    totalValue: number
}

export default class CommercialRevenueEntity implements CommercialRevenue {
    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    totalValue: number;
}