import { ApiProperty } from "@nestjs/swagger"

export interface PackagingCost {
    packagingCost: number
}

export default class PackagingCostEntity implements PackagingCost {
    @ApiProperty()
    packagingCost: number;
}
