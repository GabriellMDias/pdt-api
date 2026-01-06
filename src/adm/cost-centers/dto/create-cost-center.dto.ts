import { ApiProperty } from "@nestjs/swagger";
import {
    IsBoolean,
    IsNumber,
    IsPositive,
    IsString
} from 'class-validator'

export class CreateCostCenterDto {
    @IsNumber()
    @ApiProperty()
    id: number

    @IsString()
    @ApiProperty()
    description: string

    @IsBoolean()
    @ApiProperty()
    activeStatus: boolean
}
