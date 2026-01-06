import { ApiProperty } from "@nestjs/swagger";
import { PreExpenseApportionment } from "@prisma/client";

export class PreExpenseApportionmentEntity implements PreExpenseApportionment {
    @ApiProperty()
    id: number;

    @ApiProperty()
    preExpenseId: number;   
    
    @ApiProperty()
    costCenterId: number;  
    
    @ApiProperty()
    storeId: number;       
    
    @ApiProperty()
    percentage: number
    
    @ApiProperty()
    useParticipation: boolean
}
