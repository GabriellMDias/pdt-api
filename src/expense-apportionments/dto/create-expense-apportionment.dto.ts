import { ApiProperty } from "@nestjs/swagger";
import {
    IsNumber,
    IsPositive,
    IsBoolean,
    IsOptional
} from 'class-validator'

export class CreateExpenseApportionmentDto {
    @IsPositive()
    @IsNumber()
    @ApiProperty()
    expenseId: number

    @IsPositive()
    @IsNumber()
    @IsOptional()
    @ApiProperty()
    costCenterId: number

    @IsPositive()
    @IsNumber()
    @IsOptional()
    @ApiProperty()
    storeId: number  
    
    @IsPositive()
    @IsNumber()
    @IsOptional()
    @ApiProperty()
    percentage: number
    
    @IsBoolean()
    @IsOptional()
    @ApiProperty()
    useParticipation: boolean
}
