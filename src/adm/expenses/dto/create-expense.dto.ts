import { ApiProperty } from "@nestjs/swagger";
import {
    IsString,
    IsNumber,
    IsPositive,
    IsDateString
} from 'class-validator'

export class CreateExpenseDto {
    @IsNumber()
    @ApiProperty()
    storeId: number

    @IsDateString()
    @ApiProperty()
    date: Date

    @IsString()
    @ApiProperty()
    description: string

    @IsPositive()
    @IsNumber()
    @ApiProperty()
    value: number
}
