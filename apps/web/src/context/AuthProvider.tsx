import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { login } from "../services/auth";
import { getMe } from '../services/account';
import { AuthContext, type PermissionGrant, type UserProfile } from "./AuthContext";

interface JwtPayload {
  userId: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<(string | PermissionGrant)[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const savedToken = localStorage.getItem("accessToken");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const decoded = jwtDecode<JwtPayload>(savedToken);
        setUserId(decoded.userId);
        setToken(savedToken);

        try {
          const me = await getMe(savedToken);
          setUser(me);
        } catch {
          setUser(null);
        }

        if (decoded.userId === 0) {
          setPermissions(['*']);
        } else {
          const response = await fetch(`/api/permissions/${decoded.userId}`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          const data = await response.json();
          const arr: PermissionGrant[] = Array.isArray(data?.permissions) ? data.permissions : [];
          setPermissions(arr);
        }

        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("accessToken");
        setIsAuthenticated(false);
        setUserId(null);
        setUser(null);
        setPermissions([]);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) return <p>Carregando...</p>;

  const loginUser = async (identifier: string, password: string) => {
    const response = await login(identifier, password);
    localStorage.setItem("accessToken", response.accessToken);
    setToken(response.accessToken);

    const decoded = jwtDecode<JwtPayload>(response.accessToken);
    setUserId(decoded.userId);

    try {
      const me = await getMe(response.accessToken);
      setUser(me);
    } catch {
      setUser(null);
    }

    if (decoded.userId === 0) {
      setPermissions(['*']);
    } else {
      const res = await fetch(`/api/permissions/${decoded.userId}`, {
        headers: { Authorization: `Bearer ${response.accessToken}` },
      });
      const data = await res.json();
      const arr: PermissionGrant[] = Array.isArray(data?.permissions) ? data.permissions : [];
      setPermissions(arr);
    }

    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setIsAuthenticated(false);
    setUserId(null);
    setUser(null);
    setPermissions([]);
    setToken(null);
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loginUser, logout, userId, user, permissions, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};
