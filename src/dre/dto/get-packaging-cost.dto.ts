import { ApiProperty } from '@nestjs/swagger'
import {
    IsDateString,
    IsArray,
    ArrayNotEmpty,
    IsNumber
} from 'class-validator'

export interface GetPackagingCostInterface {
    storeId: number[]
    initialDate: Date
    finalDate: Date
}

export class GetPackagingCostDto implements GetPackagingCostInterface {
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