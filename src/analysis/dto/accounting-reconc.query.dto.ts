import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsArray, IsDateString, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class AccountingReconcQueryDto {
  @ApiPropertyOptional({
    type: Number,
    isArray: true,
    description: "Lista de lojas. Pode repetir o parâmetro ou usar vírgula",
    example: [1, 5]
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') return [value];
    if (Array.isArray(value)) return value.map((v) => Number(v));
    if (typeof value === 'string') return value.split(',').map((v) => Number(v));
    return undefined;
  })
  @IsNumber({}, { each: true })
  storeIds?: number[];

  @ApiPropertyOptional({ example: "2025-07-29" })
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  analysisCode: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  divergente?: boolean;
}
