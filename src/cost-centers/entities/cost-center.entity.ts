import { ApiProperty } from "@nestjs/swagger";
import { CostCenter } from "@prisma/client";

export class CostCenterEntity implements CostCenter {
    @ApiProperty()
    id: number;
    
    @ApiProperty()
    description: string;
}
