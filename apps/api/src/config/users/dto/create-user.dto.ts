import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsString,
    IsEmail,
    IsNotEmpty,
    MinLength,
    IsBoolean,
    IsOptional,
    IsInt,
    Min
} from 'class-validator'

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    name: string

    @IsString()
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty()
    email: string

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty()
    password: string

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false })
    notifyCostCenterType?: boolean

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false, default: true })
    activeStatus?: boolean

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @ApiPropertyOptional({
        required: false,
        nullable: true,
        description: 'Codigo do usuario no VRMaster (ERP)',
        example: 123,
    })
    codigoUsuarioVrMaster?: number | null
}
