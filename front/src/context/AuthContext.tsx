import { createContext } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  loginUser: (email: string, password: string) => Promise<void>
  logout: () => void
  userId: number | null
  permissions: string[],
  token: string | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
