// client/src/context/AuthProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { apiMe, apiLogout } from "../api/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // try to recover session on load
    apiMe()
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, ready, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
