import type { UserPermissionState } from "./types";


export function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }


export function codeGroup(code: string): string {
const i = code.indexOf(":");
return i > -1 ? code.slice(0, i) : "Geral";
}


export function isEqualPerm(a?: {global:boolean; stores:number[]}, b?: {global:boolean; stores:number[]}): boolean {
if (!a && !b) return true;
if (!a || !b) return false;
if (a.global !== b.global) return false;
if (a.stores.length !== b.stores.length) return false;
const sa = [...a.stores].sort((x,y)=>x-y);
const sb = [...b.stores].sort((x,y)=>x-y);
for (let i=0;i<sa.length;i++){ if (sa[i]!==sb[i]) return false; }
return true;
}


export function diffPermissions(original: UserPermissionState, current: UserPermissionState): string[] {
const codes = new Set([...Object.keys(original||{}), ...Object.keys(current||{})]);
const changed: string[] = [];
for (const c of codes) {
if (!isEqualPerm(original[c], current[c])) changed.push(c);
}
return changed;
}