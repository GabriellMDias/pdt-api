import { ApiProperty } from "@nestjs/swagger";

export interface Supplier {
    id: number
    razaosocial: string
}

export class SupplierEntity implements Supplier {
    @ApiProperty()
    id: number;

    @ApiProperty()
    razaosocial: string;
}