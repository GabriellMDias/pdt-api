import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from "class-validator";

export class CurvaAbcQueryDto {
  @ApiProperty({
    type: [Number],
    example: [1, 5],
    description: "IDs de loja",
  })
  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v));
    return String(value)
      .split(",")
      .map((v) => Number(v.trim()));
  })
  @IsInt({ each: true })
  @Min(1, { each: true })
  storeId!: number[];

  @ApiProperty({
    example: "2026-01-01",
    description: "Data inicial (YYYY-MM-DD)",
  })
  @IsDateString()
  initialDate!: string;

  @ApiProperty({
    example: "2026-01-31",
    description: "Data final (YYYY-MM-DD)",
  })
  @IsDateString()
  finalDate!: string;

  @ApiPropertyOptional({ example: 10, description: "Mercadologico 1" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  mercadologico1?: number;

  @ApiPropertyOptional({ example: 20, description: "Mercadologico 2" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  mercadologico2?: number;
}
