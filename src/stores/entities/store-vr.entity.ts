import { ApiProperty } from "@nestjs/swagger";

export interface StoreVr {
    id: number,
    description: string
}

export class StoreVrEntity implements StoreVr  {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;
}
