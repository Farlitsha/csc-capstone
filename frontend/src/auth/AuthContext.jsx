import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../lib/api";
import { decodeJwt } from "../lib/jwt";

const AuthContext = createContext(null);

const TOKEN_KEY = "commhub_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // Token invalid/expired — fall back to the JWT payload if we can, else log out.
      const claims = decodeJwt(currentToken);
      if (claims?.user_id) {
        setUser({
          id: claims.user_id,
          role: claims.role,
          display_name: null,
          avatar_url: null,
        });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (username, password) => {
    try {
      const { access_token } = await api.login(username, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setToken(access_token);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Could not reach the server";
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // ignore - loadUser's own error handling covers real auth failures
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
