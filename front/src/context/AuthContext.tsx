import { createContext } from "react"

export interface PermissionGrant {
  code: string;
  global: boolean;
  stores: number[];
}

interface AuthContextType {
  isAuthenticated: boolean
  loginUser: (email: string, password: string) => Promise<void>
  logout: () => void
  userId: number | null
  // Agora aceitamos tanto string[] quanto PermissionGrant[]
  permissions: (string | PermissionGrant)[],
  token: string | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)