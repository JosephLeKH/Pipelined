/** Auth context: provides current user state, login/logout actions, and session initialization. */

import { createContext, useContext, useState, useCallback, useEffect } from "react";

import { fetchCurrentUser } from "../api/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => console.error("[auth] Failed to fetch current user:", err.message))
      .finally(() => setIsInitialized(true));
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isInitialized, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
