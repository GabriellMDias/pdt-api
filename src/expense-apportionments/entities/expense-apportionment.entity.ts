import { ExpenseApportionment } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class ExpenseApportionmentEntity implements ExpenseApportionment {
    @ApiProperty()
    id: number;

    @ApiProperty()
    expenseId: number;   
    
    @ApiProperty()
    costCenterId: number;  
    
    @ApiProperty()
    storeId: number;       
    
    @ApiProperty()
    percentage: number
    
    @ApiProperty()
    useParticipation: boolean
}
