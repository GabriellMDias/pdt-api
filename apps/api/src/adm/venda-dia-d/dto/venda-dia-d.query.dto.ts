import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsInt, Min } from "class-validator";

export enum VendaDiaDViewType {
  Total = "total",
  Diario = "diario",
  Mensal = "mensal",
  Periodo = "periodo",
}

export class VendaDiaDQueryDto {
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

  @ApiProperty({ example: "2026-01-01", description: "Data inicial (YYYY-MM-DD)" })
  @IsDateString()
  initialDate!: string;

  @ApiProperty({ example: "2026-01-31", description: "Data final (YYYY-MM-DD)" })
  @IsDateString()
  finalDate!: string;

  @ApiProperty({
    enum: VendaDiaDViewType,
    enumName: "VendaDiaDViewType",
    example: VendaDiaDViewType.Total,
    description: "Tipo de visualizacao do relatorio",
  })
  @Transform(({ value }) => String(value).toLowerCase())
  @IsEnum(VendaDiaDViewType)
  viewType!: VendaDiaDViewType;
}
