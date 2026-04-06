import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from "class-validator";

function parseNumberArray(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item));
}

function parseStringArray(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export class CurvaAbcQueryDto {
  @ApiProperty({
    type: [Number],
    example: [1, 5],
    description: "IDs de loja",
  })
  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) => parseNumberArray(value) ?? [])
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

  @ApiPropertyOptional({
    type: [String],
    example: ["1:1", "2:5"],
    description: "Pares mercadologico1:mercadologico2",
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseStringArray(value))
  @Matches(/^\d+:\d+$/, { each: true })
  mercadologicoPair?: string[];
}
