import { useAuth } from "../hooks/useAuth"

interface PermissionGateProps {
  required: string | string[]
  children: React.ReactNode
}

export default function PermissionGate({ required, children }: PermissionGateProps) {
  const { permissions } = useAuth()

  const requiredPermissions = Array.isArray(required) ? required : [required]

  const hasPermission = requiredPermissions.some(p => permissions.includes(p))

  if (!hasPermission) return null

  return <>{children}</>
}
