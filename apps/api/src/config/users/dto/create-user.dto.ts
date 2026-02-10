import { ApiProperty } from "@nestjs/swagger";
import {
    IsString,
    IsEmail,
    IsNotEmpty,
    MinLength,
    IsBoolean,
    IsOptional
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
}
