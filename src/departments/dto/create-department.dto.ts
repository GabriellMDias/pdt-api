import { ApiProperty } from "@nestjs/swagger";
import {
    IsNumber,
    IsPositive,
    IsString
} from 'class-validator'

export class CreateDepartmentDto {
    @IsNumber()
    @ApiProperty()
    costCenterId: number

    @IsString()
    @ApiProperty()
    description: string

    @IsNumber()
    @ApiProperty()
    departmentVrId1: number
   
    @IsNumber()
    @ApiProperty()
    departmentVrId2: number
    
    @IsNumber()
    @IsPositive()
    @ApiProperty()
    level: number
}
