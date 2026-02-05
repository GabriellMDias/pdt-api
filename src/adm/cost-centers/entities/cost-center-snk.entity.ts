import { ApiProperty } from "@nestjs/swagger"

export interface CostCenterSnk {
    CODCENCUS: number
    DESCRCENCUS: string
}

export class CostCenterSnkEntity implements CostCenterSnk {
    @ApiProperty()
    CODCENCUS: number

    @ApiProperty()
    DESCRCENCUS: string
} 