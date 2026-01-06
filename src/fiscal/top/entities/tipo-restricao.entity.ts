import { ApiProperty } from "@nestjs/swagger";

export interface TipoRestricao {
    id: number
    descricao: string
}

export class TipoRestricaoEntity implements TipoRestricao {
    @ApiProperty()
    id: number

    @ApiProperty()
    descricao: string;
}