import { ApiProperty } from "@nestjs/swagger";

export interface User {
    id: number
    nome: string
}

export class UserEntity implements User {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nome: string;
}