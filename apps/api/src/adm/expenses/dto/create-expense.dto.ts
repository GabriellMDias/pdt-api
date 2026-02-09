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

export class CreateExpenseDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  storeId: number;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  value: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  expenseTypeId: number;

  @ApiProperty({ type: [ApportionmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApportionmentDto)
  apportionments: ApportionmentDto[];
}
