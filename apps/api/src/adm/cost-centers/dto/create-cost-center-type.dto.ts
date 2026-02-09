import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from "class-validator";

export class CostCenterTypeItemDto {
    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    costCenterId?: number | null;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    storeId?: number | null;

    @ApiProperty()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    percentage?: number | null;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    participation?: boolean | null;
}
export class CreateCostCenterTypeDto {
    @ApiProperty()
    @IsString()
    @Type(() => String)
    description: string;

    @ApiProperty()
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    id_costcentertype_vr?: number;

    @ApiProperty()
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    codcencus_sankhya?: number | null;

    @ApiProperty()
    @IsBoolean()
    @Type(() => Boolean)
    useParticipationStore: boolean;

    @ApiProperty()
    @IsBoolean()
    @Type(() => Boolean)
    useParticipationCostCenter: boolean;

    @ApiProperty()
    @IsBoolean()
    @Type(() => Boolean)
    verified?: boolean | null;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    activeStatus?: boolean | null;

    @ApiProperty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CostCenterTypeItemDto)
    costCenterTypeItems: CostCenterTypeItemDto[];
}
