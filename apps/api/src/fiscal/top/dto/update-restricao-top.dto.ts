import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRestricaoTopDto {

    @ApiProperty({ example: 56 })
    @Type(() => Number)
    @IsNumber()
    codtipoper: number;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsNumber()
    id_tipmov: number;

    @ApiProperty({ example: 6 })
    @Type(() => Number)
    @IsNumber()
    id_tiporestricao: number;

    @ApiProperty({
        example: [1, 2, 3],
        required: false,
        description: 'Lista de códigos de coluna da restrição',
    })
    @IsOptional()
    @IsArray()
    @Type(() => Number)
    codcolrest?: number[];

    @ApiProperty({
        example: ['A', 'B'],
        required: false,
        description: 'Lista de séries (somente para tipo restrição = 4)',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    series?: string[];

    @ApiProperty({
        enum: ['S', 'N'],
        example: 'S',
    })
    @IsIn(['S', 'N'])
    restricao: 'S' | 'N';
}
