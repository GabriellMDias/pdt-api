import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ArrayNotEmpty, IsNumber, IsDateString, IsEnum } from "class-validator";
import { Transform } from "class-transformer";

export enum CompareMode {
  Range = 'range',
  Month = 'month',
}

export class CostCenterComparativeQueryDto {
    @ApiProperty({ type: [Number], example: [1, 2, 5], description: 'IDs de loja' })
    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true })
    @Transform(({ value }) => {
      if (Array.isArray(value)) return value.map((v) => Number(v));
      // aceita "?storeId=1&storeId=2" ou "?storeId=1,2"
      return String(value).split(',').map((v) => Number(v.trim()));
    })
    storeId: number[];

    @ApiProperty({ example: '2025-05-01' })
    @IsDateString()
    initialDate: string;
    
    @ApiProperty({ example: '2025-10-26' })
    @IsDateString()
    finalDate: string;

    @ApiProperty({enum: CompareMode, enumName: 'CompareMode'})
    @Transform(({ value }) => String(value).toLowerCase())
    @IsEnum(CompareMode)
    mode: CompareMode
}