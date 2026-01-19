export type DRE = {
    recBruta: number,
    devolucao: number,
    imposto: number,
    custo: number,
    embalagem: number,
    quebra: number,
    recCom: number,
    despesaPessoal: number,
    despesaPessoalRat: number,
    despesaOperacional: number
}

export type DREByCostCenter = {
    costCenterId: number,
    data: DRE
}

export type GetDREParams = {
    storeId: number[] | string[],
    costCenterId?: number[] | string[],
    initialDate: string, //YYYY-MM-DD
    finalDate: string, //YYYY-MM-DD
}

export type CostCenter = {
    id: number,
    description: number,
    activeStatus: boolean
}

export type Store = {
    id: number,
    description: string,
    storeName: string,
    activeStatus: boolean,
    cnpj: string
}