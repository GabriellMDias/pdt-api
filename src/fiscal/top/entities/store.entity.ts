import { ApiProperty } from "@nestjs/swagger";

export interface Store {
    id: number
    descricao: string
}

export class StoreEntity implements Store {
    @ApiProperty()
    id: number;

    @ApiProperty()
    descricao: string;
}