import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from "class-validator";

export class CreateUserPermissionDto {

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    permissionsCode: string[]

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty()
    enable: boolean

    @ApiPropertyOptional({ description: 'Omitido => global; número => por loja' })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    storeId?: number; // ausência => global
}
