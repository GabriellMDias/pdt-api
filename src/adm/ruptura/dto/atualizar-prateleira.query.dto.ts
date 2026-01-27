import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsNumber } from "class-validator";

export class AtualizarPrateleiraQueryDto {
  @ApiProperty({example: 1})
  @Type(() => Number)
  @IsNumber()
  storeId: number;

  @ApiProperty({ example: "2025-05-01" })
  @IsDateString()
  initialDate: string;

  @ApiProperty({ example: "2025-10-26" })
  @IsDateString()
  finalDate: string;
}
