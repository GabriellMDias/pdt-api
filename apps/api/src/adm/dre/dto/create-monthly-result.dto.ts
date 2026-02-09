import { ApiProperty } from "@nestjs/swagger";
import {
    IsDateString,
    IsNumber,
    IsPositive
} from 'class-validator'

export class CreateMonthlyResultDto {
    @IsPositive()
    @IsNumber()
    @ApiProperty()
    storeId: number

    @IsPositive()
    @IsNumber()
    @ApiProperty()
    costCenterId: number

    @IsDateString()
    @ApiProperty()
    date: Date
    
    @IsNumber()
    @ApiProperty()
    recBruta: number

    @IsNumber()
    @ApiProperty()
    devolucao: number

    @IsNumber()
    @ApiProperty()
    imposto: number

    @IsNumber()
    @ApiProperty()
    custo: number

    @IsNumber()
    @ApiProperty()
    embalagem: number

    @IsNumber()
    @ApiProperty()
    quebra: number

    @IsNumber()
    @ApiProperty()
    recCom: number
    
    @IsNumber()
    @ApiProperty()
    despesaPessoal: number
    
    @IsNumber()
    @ApiProperty()
    despesaOperacional: number
}
