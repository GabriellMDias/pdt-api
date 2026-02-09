export type SankhyaStatus = '0' | '1' | '2' | '3';

export interface SankhyaDollarNode {
  $: string;
}

export interface SankhyaError {
  tsErrorCode: string;
  tsErrorLevel: string;
}

export interface SankhyaResponseBase<T = unknown> {
  serviceName: string;
  status: SankhyaStatus;
  pendingPrinting?: string;
  transactionId?: string;
  responseBody?: T;
  statusMessage?: string;
  tsError?: SankhyaError;
}

export interface LoginResponseBody {
  callID: SankhyaDollarNode;
  jsessionid: SankhyaDollarNode;
  idusu: SankhyaDollarNode;
}

export type LoginResponse = SankhyaResponseBase<LoginResponseBody>;

export interface FieldMetadata {
  name: string;
  description: string;
  order: number;
  userType: 'S' | 'I' | 'F' | 'T' | 'D' | 'H'; // inteiro, string, numérico etc.
}

export interface ExecuteQueryResponseBody {
  fieldsMetadata: FieldMetadata[];
  rows: unknown[][];
  burstLimit: boolean;
  timeQuery: string;      // ex: "27ms"
  timeResultSet: string;  // ex: "1ms"
}

export type ExecuteQueryResponse = SankhyaResponseBase<ExecuteQueryResponseBody>;

// Resultado já mapeado (nome da coluna -> valor)
export type QueryRowObject = Record<string, unknown>;