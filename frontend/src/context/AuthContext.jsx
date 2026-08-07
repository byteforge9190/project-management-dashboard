import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const persist = (data, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("accessToken", data.accessToken);
    storage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
  };

  const login = async (email, password, rememberMe) => {
    const { data } = await api.post("/auth/login", { email, password, rememberMe });
    persist(data, rememberMe);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    persist(data, true);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      /* ignore */
    }
    ["accessToken", "refreshToken"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
