import { ApiProperty } from "@nestjs/swagger"

export interface LossAndComsumption {
    costCenterId: number
    totalValue: number
}

export default class LossAndComsumptionEntity implements LossAndComsumption {
    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    totalValue: number;
}
