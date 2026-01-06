import { PreExpense } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class PreExpenseEntity implements PreExpense {
    @ApiProperty()
    id: number;

    @ApiProperty()
    storeId: number;

    @ApiProperty()
    description: string;
}
