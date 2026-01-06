import { ApiProperty } from "@nestjs/swagger";

export interface Product {
    id: number
    descricaocompleta: string
}

export class ProductEntity implements Product {
    @ApiProperty()
    id: number;

    @ApiProperty()
    descricaocompleta: string;
}