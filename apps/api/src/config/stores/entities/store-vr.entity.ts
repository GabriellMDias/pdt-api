import { ApiProperty } from "@nestjs/swagger";

export interface StoreVr {
    id: number,
    description: string,
    cnpj: number
}

export class StoreVrEntity implements StoreVr  {
    @ApiProperty()
    id: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    cnpj: number;
}
