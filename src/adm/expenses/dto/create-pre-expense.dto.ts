import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
  ValidateNested,
  IsArray,
  IsBoolean
} from "class-validator";
import { Type } from "class-transformer";

export class ApportionmentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  costCenterId: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  storeId: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  percentage: number;

  @ApiProperty()
  @IsBoolean()
  useParticipation: boolean;
}


export class CreatePreExpenseDto {
    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    storeId: number;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    expenseTypeId: number;

    @ApiProperty()
    @IsBoolean()
    isActived: boolean;

    @ApiProperty({ type: [ApportionmentDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ApportionmentDto)
    apportionments: ApportionmentDto[];
}
