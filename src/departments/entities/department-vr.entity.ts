import { ApiProperty } from "@nestjs/swagger";

export interface DepartmentVr {
    id: number
    costCenterId: number
    description: string
    departmentVrId1: number
    departmentVrId2: number
    level: number
}

export class DepartmentVrEntity implements DepartmentVr {
    @ApiProperty()
    id: number;
    
    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    departmentVrId1: number;

    @ApiProperty()
    departmentVrId2: number;

    @ApiProperty()
    level: number;
}
