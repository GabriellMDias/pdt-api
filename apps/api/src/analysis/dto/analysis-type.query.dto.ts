import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class AnalysisTypeQueryDto {
  @ApiPropertyOptional({ example: "Conciliação Contábil" })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: "conc_contab_aplicacao" })
  @IsOptional()
  @IsString()
  code?: string;
}
