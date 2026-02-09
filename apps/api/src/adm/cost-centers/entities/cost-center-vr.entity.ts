import { ApiProperty } from "@nestjs/swagger";

export interface CostCenterVr {
    id: number,
    description: string,
    activeStatus: boolean
}

export class CostCenterVrEntity implements CostCenterVr  {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    activeStatus: boolean;
}
