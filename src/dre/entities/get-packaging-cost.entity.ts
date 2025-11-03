import { ApiProperty } from "@nestjs/swagger"

export interface PackagingCost {
    costCenterId: number;
    packagingCost: number
}

export default class PackagingCostEntity implements PackagingCost {
    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    packagingCost: number;
}
