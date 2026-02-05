import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsPositive, IsString, ValidateNested } from "class-validator";

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
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    percentage?: number | null;

    @ApiProperty()
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
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    id_costcentertype_vr: number;

    @ApiProperty()
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
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CostCenterTypeItemDto)
    costCenterTypeItems: CostCenterTypeItemDto[];
}