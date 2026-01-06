import { ApiProperty } from "@nestjs/swagger";

export interface Top {
    id: number,
    descricao: string,
    tipmov: number,
    id_situacaocadastro: 0 | 1,
}

export class TopEntity implements Top {
    @ApiProperty()
    id: number;

    @ApiProperty()
    descricao: string;

    @ApiProperty()
    tipmov: number;
    
    @ApiProperty()
    id_situacaocadastro: 0 | 1;
}