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

export class PreExpenseEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  storeId: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  expenseTypeId: number;

  @ApiProperty({ type: [Apportionment] })
  apportionments: Apportionment[];
}

