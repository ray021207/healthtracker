import { createContext, useContext, useState, type ReactNode } from "react";

import { api } from "./api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clinicId: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_CREDENTIALS_KEY = "mh_demo_credentials_changed";

export function markDemoCredentialsChanged() {
  try {
    localStorage.setItem(DEMO_CREDENTIALS_KEY, "1");
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export function hasChangedDemoCredentials(): boolean {
  try {
    return localStorage.getItem(DEMO_CREDENTIALS_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("mh_user");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem("mh_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore network error on logout
    }
    localStorage.removeItem("mh_user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
