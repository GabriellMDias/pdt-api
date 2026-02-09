import { ApiProperty } from "@nestjs/swagger";

export interface CostCenterTypeVr {
    id_costcentertype_vr: number,
    description: string,
    activeStatus: boolean,
    costCenterId: number,
    storeId: number,
    percentage: number
}

export interface CostCenterTypeVrGrouped {
    id_costcentertype_vr: number,
    description: string,
    activeStatus: boolean,
    items: CostCenterTypeVrItem[]
}

export interface CostCenterTypeVrItem {
    costCenterId: number,
    storeId: number,
    percentage: number
}

export class CostCenterTypeVrEntity implements CostCenterTypeVr {
    @ApiProperty()
    id_costcentertype_vr: number;
    @ApiProperty()
    description: string;
    @ApiProperty()
    activeStatus: boolean;
    @ApiProperty()
    costCenterId: number;
    @ApiProperty()
    storeId: number;
    @ApiProperty()
    percentage: number;
}