import { IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";

export class UpdateParameterDto {
    @IsString()
    @IsNotEmpty()
    value!: string; // serviço faz parse conforme o tipo do parâmetro

    @IsOptional()
    @ValidateIf((o) => o.storeId !== undefined)
    @IsInt()
    storeId?: number;
}