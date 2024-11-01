import { ApiProperty } from '@nestjs/swagger'
import {
    IsDateString,
    IsArray,
    ArrayNotEmpty,
    IsNumber
} from 'class-validator'

export interface GetCommercialRevenueDtoInterface {
    storeId: number[]
    initialDate: Date
    finalDate: Date
}

export class GetCommercialRevenueDto implements GetCommercialRevenueDtoInterface {
    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true })
    @ApiProperty({ type: Number, isArray: true })
    storeId: number[];

    @IsDateString()
    @ApiProperty()
    initialDate: Date

    @IsDateString()
    @ApiProperty()
    finalDate: Date
}