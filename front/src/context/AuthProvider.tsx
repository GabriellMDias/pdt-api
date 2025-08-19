import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { login } from "../services/auth";
import { AuthContext } from "./AuthContext";

interface JwtPayload {
  userId: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
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

        const response = await fetch(`/api/permissions/${decoded.userId}`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        const data = await response.json();

        if( decoded.userId === 0 ) {
          const response = await fetch(`/api/permissions`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });

          const allPermissions = (await response.json()).map((permission: { code: string; }) => permission.code)

          setPermissions(allPermissions);
        } else {
          setPermissions(data.permissions);
        }
        
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("accessToken");
        setIsAuthenticated(false);
        setUserId(null);
        setPermissions([]);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) return <p>Carregando...</p>;

  const loginUser = async (email: string, password: string) => {
    const response = await login(email, password);
    localStorage.setItem("accessToken", response.accessToken);
    setToken(response.accessToken);

    const decoded = jwtDecode<JwtPayload>(response.accessToken);
    setUserId(decoded.userId);

    const res = await fetch(`/api/permissions/${decoded.userId}`, {
      headers: { Authorization: `Bearer ${response.accessToken}` },
    });

    const data = await res.json();
    setPermissions(data.permissions);

    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setIsAuthenticated(false);
    setUserId(null);
    setPermissions([]);
    setToken(null);
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loginUser, logout, userId, permissions, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};
