export type TipMov = {
    id: number
    descricao: string
}

export type TipoRestricao = {
    id: number
    descricao: string
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

export type GetRestricaoTopParams = {
    codtipoper: number
    tipmov: number
    tiporestricao: number
}

export type TOP = {
    id: number
    descricao: string
    tipmov: number
    id_situacaocadastro: number
}