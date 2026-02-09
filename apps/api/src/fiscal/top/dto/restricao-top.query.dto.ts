import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";

export class RestricaoTopQueryDto {
    @ApiProperty({ type: Number, example: 1, description: 'Código da TOP' })
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    codtipoper: number

    @ApiProperty({ type: Number, example: 1, description: 'Código do tipo movimento. 1=Nota Entrada; 2=Nota Saída; 3=Nota Despesa' })
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    tipmov: number

    @ApiProperty({ type: Number, example: 1, description: 'Código do tipo restrição.' })
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    tiporestricao: number
}