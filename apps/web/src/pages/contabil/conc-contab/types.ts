export interface AnalysisType {
    id: number
    code: string
    description: string
    active: boolean
    groupName: string
    fields: AnalysisField[]
}

export interface AnalysisField {
    id: number
    analysisTypeId: number
    key: string
    label: string
    dataType: "int" | "string" | "decimal" | "boolean" | "date" | "datetime"
    isArray: boolean
    nullable: boolean
    order: number
}

export type CompareMode = "divergente" | "todos"


export type GetConcContabParams = {
    date: string, //YYYY-MM-DD
    storeIds: number[] | string[],
    consulta: string, //YYYY-MM-DD
    compareMode: CompareMode
}