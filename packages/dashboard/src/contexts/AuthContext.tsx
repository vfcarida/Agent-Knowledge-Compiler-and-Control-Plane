import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * DEMO-ONLY authentication. There is no real identity provider or login
 * endpoint behind this — `login()` just accepts whatever identity/role the
 * caller passes and stores it in localStorage. The dashboard BFF (see
 * server/index.ts + server/auth-middleware.ts) only accepts this client-chosen
 * identity verbatim when DASHBOARD_DEMO_MODE=true; a real deployment must wire
 * both a real IdP here and set DASHBOARD_JWT_SECRET on the BFF, at which point
 * this login() should be replaced with a real authentication round-trip.
 */
export interface User {
  identity: string;
  name: string;
  role: "admin" | "viewer";
}

interface AuthContextType {
  user: User | null;
  login: (identity: string, name: string, role?: "admin" | "viewer") => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage for mock session
    const storedUser = localStorage.getItem("mockUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (
    identity: string,
    name: string,
    role: "admin" | "viewer" = "admin",
  ) => {
    // eslint-disable-next-line no-console
    console.warn(
      "[AuthContext] DEMO login: no real identity provider is involved — " +
        "this identity/role is trusted as-is by the BFF only when " +
        "DASHBOARD_DEMO_MODE=true. Do not rely on this for real access control.",
    );
    const newUser = { identity, name, role };
    setUser(newUser);
    localStorage.setItem("mockUser", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mockUser");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
