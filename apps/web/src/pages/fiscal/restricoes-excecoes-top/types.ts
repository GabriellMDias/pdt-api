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
  restricoes: Array<{
    id_tiporestricao: number
    codcolrest: Array<number | null>
    series: string[] | null
    restricao: 'S' | 'N'
  }>
}

export type GetRestricaoTopParams = {
  codtipoper: number
  tipmov: number
  tiporestricao: number
}

export type UpdateRestricaoTopBody = {
  codtipoper: number
  id_tipmov: number
  id_tiporestricao: number
  restricao: 'S' | 'N'
  codcolrest?: number[]
  series?: string[]
}

export type TOP = {
  id: number
  descricao: string
  tipmov: number
  id_situacaocadastro?: 0 | 1
}

export type Paginated<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type StoreRow = {
  id: number
  descricao: string
}

export type SupplierRow = {
  id: number
  razaosocial: string
}

export type ProductRow = {
  id: number
  descricaocompleta: string
}

export type UserRow = {
  id: number
  nome: string
}

export type ProductTypeRow = {
  id: number
  descricao: string
}

export type LookupItem = {
  id: number
  label: string
}
