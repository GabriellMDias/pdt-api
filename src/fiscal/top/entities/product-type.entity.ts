import { ApiProperty } from "@nestjs/swagger";

export interface ProductType {
    id: number
    descricao: string
}

export class ProductTypeEntity implements ProductType {
    @ApiProperty()
    id: number

    @ApiProperty()
    descricao: string
}