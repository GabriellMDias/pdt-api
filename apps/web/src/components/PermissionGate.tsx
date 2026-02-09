import { useAuth } from "../hooks/useAuth"

type PermissionGrant = { code: string; global: boolean; stores: number[] }
type PermissionBag = Array<string | PermissionGrant>

interface PermissionGateProps {
  required: string | string[]
  /** Opcional: validação por loja — se informado, aceita global=true OU presence na stores[] */
  storeId?: number
  children: React.ReactNode
}

function hasPermission(perms: PermissionBag, required: string, storeId?: number): boolean {
  if (!required) return true
  if (!Array.isArray(perms) || perms.length === 0) return false

  // 1) Strings (exato e curingas)
  const strings = perms.filter(p => typeof p === "string") as string[]
  if (strings.includes(required) || strings.includes("*") || strings.includes("all")) return true
  const i = required.indexOf(":")
  if (i > -1) {
    const prefix = required.slice(0, i)
    if (strings.includes(`${prefix}:*`)) return true
  }

  // 2) Objetos estruturados { code, global, stores }
  const objs = perms.filter(p => typeof p === "object") as PermissionGrant[]

  // Ignora storeId 0
  const validStoreId = typeof storeId === "number" && storeId !== 0 ? storeId : undefined

  return objs.some(p => {
    if (p.code !== required) return false
    if (p.global) return true
    if (!Array.isArray(p.stores) || p.stores.length === 0) return false
    // Se storeId foi informado, exige presença específica; senão, qualquer loja serve
    return validStoreId ? p.stores.includes(validStoreId) : p.stores.length > 0
  })
}

export default function PermissionGate({ required, storeId, children }: PermissionGateProps) {
  const { permissions, userId } = useAuth()
  const requiredPermissions = Array.isArray(required) ? required : [required]

  // Admin (id=0) sempre pode
  const allowed =
    userId === 0 ||
    requiredPermissions.some(code => hasPermission(permissions as PermissionBag, code, storeId))

  if (!allowed) return null
  return <>{children}</>
}
