import { createContext } from "react"

export interface PermissionGrant {
  code: string;
  global: boolean;
  stores: number[];
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean
  loginUser: (email: string, password: string) => Promise<void>
  logout: () => void
  userId: number | null
  user: UserProfile | null
  permissions: (string | PermissionGrant)[],
  token: string | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
