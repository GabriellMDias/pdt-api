import { ApiProperty } from "@nestjs/swagger";


export class Apportionment {
  @ApiProperty()
  costCenterId: number;

  @ApiProperty()
  storeId: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  useParticipation: boolean;
}

export class ExpenseEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  storeId: number;

  @ApiProperty({ type: String, format: "date-time" })
  date: Date;

  @ApiProperty()
  description: string;

  @ApiProperty()
  expenseTypeId: number;

  @ApiProperty()
  value: number;

  @ApiProperty({ type: [Apportionment] })
  apportionments: Apportionment[];
}

