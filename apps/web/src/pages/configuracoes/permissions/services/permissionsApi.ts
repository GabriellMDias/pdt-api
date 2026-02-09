export const API = {
USERS: "/api/users",
STORES: "/api/stores",
CATALOG: "/api/permissions", // GET catálogo de permissões
USER: (id: number) => `/api/permissions/${id}`, // GET/PATCH permissões de um usuário
};


export const authHeaders = (token?: string | null) => ({
"Content-Type": "application/json",
...(token ? { Authorization: `Bearer ${token}` } : {}),
});


export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
const res = await fetch(input, init);
if (!res.ok) {
const text = await res.text().catch(() => "");
throw new Error(text || `HTTP ${res.status}`);
}
return res.json() as Promise<T>;
}