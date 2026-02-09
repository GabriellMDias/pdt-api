import { ApiProperty } from "@nestjs/swagger";

export interface TipMov {
    id: number
    descricao: string
}

export class TipMovEntity implements TipMov {
    @ApiProperty()
    id: number

    @ApiProperty()
    descricao: string;
}