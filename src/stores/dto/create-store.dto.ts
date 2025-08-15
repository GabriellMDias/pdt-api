import { ApiProperty } from "@nestjs/swagger";
import {
    IsBoolean,
    IsString,
    MaxLength,
    IsNumber,
    IsPositive
} from 'class-validator'

export class CreateStoreDto {
    @IsNumber()
    @IsPositive()
    @ApiProperty()
    id: number;

    @IsString()
    @ApiProperty()
    description: string;

    @ApiProperty()
    @MaxLength(50)
    storeName: string;

    @ApiProperty()
    @IsString()
    cnpj: string;

    @IsBoolean()
    @ApiProperty()
    activeStatus: boolean;
}
