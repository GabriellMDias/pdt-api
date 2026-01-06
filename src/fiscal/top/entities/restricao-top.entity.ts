import { ApiProperty } from "@nestjs/swagger";

export interface RestricaoTopRaw {
    codtipoper: number
    id_tipmov: number
    id_tiporestricao: number
    codcolrest: number
    serie: string | null
    restricao: 'S' | 'N'
}

export interface RestricaoTop {
    codtipoper: number
    id_tipmov: number
    restricoes: {
        id_tiporestricao: number
        codcolrest: number[]
        series: string[] | null
        restricao: 'S' | 'N'
    }[]
}

export class RestricaoTopEntity implements RestricaoTop {

    @ApiProperty({
        description: 'Código do tipo de operação (TOP)',
        example: 501,
        type: Number,
    })
    codtipoper: number;

    @ApiProperty({
        description: 'Identificador do tipo de movimento vinculado à TOP',
        example: 1,
        type: Number,
    })
    id_tipmov: number;

    @ApiProperty({
        description: 'Lista de restrições aplicadas à TOP',
        type: 'array',
        example: [
            {
                id_tiporestricao: 2,
                codcolrest: [10, 20, 30],
                series: null,
                restricao: 'S',
            },
            {
                id_tiporestricao: 5,
                codcolrest: [],
                series: ['50', '55'],
                restricao: 'N',
            },
        ],
        items: {
            type: 'object',
            properties: {
                id_tiporestricao: {
                    type: 'number',
                    description: 'Identificador do tipo de restrição',
                    example: 2,
                },
                codcolrest: {
                    type: 'array',
                    description: 'Lista de códigos de coluna relacionados à restrição',
                    example: [10, 20, 30],
                    items: {
                        type: 'number',
                    },
                },
                series: {
                    type: 'array',
                    nullable: true,
                    description: 'Lista de séries permitidas ou bloqueadas. Pode ser null quando não aplicável',
                    example: ['A', 'B'],
                    items: {
                        type: 'string',
                    },
                },
                restricao: {
                    type: 'string',
                    description: 'S = Só pode ser usado com... | N = Não pode ser usado com...',
                    example: 'S',
                    enum: ['S', 'N'],
                },
            },
        },
    })
    restricoes: {
        id_tiporestricao: number;
        codcolrest: number[];
        series: string[] | null;
        restricao: 'S' | 'N';
    }[];
}