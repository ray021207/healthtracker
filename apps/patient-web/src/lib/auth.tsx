import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "monark_patient_auth";

function loadStored(): { user: AuthUser; accessToken: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(loadStored);
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(stored?.accessToken ?? null);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client-type": "mobile" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, accessToken: data.accessToken }));
    setUser(data.user);
    setAccessToken(data.accessToken);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
  };

  return <AuthContext.Provider value={{ user, accessToken, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
