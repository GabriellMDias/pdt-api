import { Store } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class StoreEntity implements Store  {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    storeName: string;

    @ApiProperty()
    activeStatus: boolean;
}
