import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
    IsDateString,
    IsArray,
    ArrayNotEmpty,
    IsNumber,
    IsBoolean
} from 'class-validator'

export interface GetLossAndConsumptionDtoInterface {
    storeId: number[]
    initialDate: Date
    finalDate: Date
    considerNegativeValues: boolean
}

export class GetLossAndConsumptionDto implements GetLossAndConsumptionDtoInterface {
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

    @IsBoolean()
    @ApiProperty()
    @ApiPropertyOptional({default: true})
    considerNegativeValues: boolean;
}