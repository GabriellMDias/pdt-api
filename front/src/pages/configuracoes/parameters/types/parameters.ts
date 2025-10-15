/* eslint-disable @typescript-eslint/no-explicit-any */
export type ParameterScope = 'GLOBAL' | 'STORE' | 'BOTH';
export type ParameterType = 'STRING' | 'INT' | 'BOOL' | 'JSON';

export interface ParameterListItem {
  code: string;
  description: string;
  group: string | null;
  scope: ParameterScope;
  type: ParameterType;
  value: any; // AnyJson
  source?: 'GLOBAL' | 'STORE' | null;
}

export interface ParameterEffective {
  code: string;
  type: ParameterType;
  scope: ParameterScope;
  value: any; // AnyJson
  source: 'GLOBAL' | 'STORE';
}

export type PatchGlobalBody = { value: any };
export type PatchStoreBody = { value: any; storeId: number };