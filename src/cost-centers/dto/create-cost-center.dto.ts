import { ApiProperty } from "@nestjs/swagger";
import {
    IsNumber,
    IsPositive,
    IsString
} from 'class-validator'

export class CreateCostCenterDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty()
    id: number

    @IsString()
    @ApiProperty()
    description: string
}
