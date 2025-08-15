import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CreateUserPermissionDto {

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    permissionsCode: string[]

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty()
    enable: boolean
}
