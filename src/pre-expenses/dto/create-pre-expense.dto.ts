import { ApiProperty } from "@nestjs/swagger";
import {
    IsString,
    IsNumber,
    IsPositive,
    IsDateString
} from 'class-validator'


export class CreatePreExpenseDto {
    @IsNumber()
    @ApiProperty()
    storeId: number

    @IsString()
    @ApiProperty()
    description: string
}
