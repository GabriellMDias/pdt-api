import { ApiProperty } from "@nestjs/swagger";
import { Department } from '@prisma/client'

export class DepartmentEntity implements Department {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    costCenterId: number;

    @ApiProperty()
    departmentVrId1: number;

    @ApiProperty()
    departmentVrId2: number;

    @ApiProperty()
    level: number;
}
