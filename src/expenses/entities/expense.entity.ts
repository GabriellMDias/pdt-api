import { Expense } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class ExpenseEntity implements Expense {
    @ApiProperty()
    id: number;

    @ApiProperty()
    storeId: number;

    @ApiProperty()
    date: Date;

    @ApiProperty()
    description: string;

    @ApiProperty()
    value: number;
}
