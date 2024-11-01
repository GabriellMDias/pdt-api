import { ApiProperty } from '@nestjs/swagger'
import {
    IsDateString,
    IsArray,
    ArrayNotEmpty,
    IsNumber
} from 'class-validator'

export interface GetStoresSalesDtoInterface {
    storeId: number[]
    initialDate: Date
    finalDate: Date
}

export class GetStoresSalesDto implements GetStoresSalesDtoInterface {
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