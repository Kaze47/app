// AuthContext: manages token + user. Supports JWT (email/pass) and Emergent Google session_token.
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { storage } from "@/src/utils/storage";
import { api, ApiUser, TOKEN_KEY } from "@/src/api";

type AuthState = {
  loading: boolean;
  user: ApiUser | null;
  token: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, display_name: string) => Promise<void>;
  signInWithSessionToken: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<ApiUser>) => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const setSession = useCallback(async (t: string, u: ApiUser) => {
    await storage.secureSet(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      await storage.secureRemove(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await setSession(res.token, res.user);
  }, [setSession]);

  const signUpEmail = useCallback(async (email: string, password: string, display_name: string) => {
    const res = await api.register({ email, password, display_name });
    await setSession(res.token, res.user);
  }, [setSession]);

  const signInWithSessionToken = useCallback(async (sessionToken: string) => {
    const res = await api.sessionLogin(sessionToken);
    await setSession(res.token, res.user);
  }, [setSession]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch {}
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch: Partial<ApiUser>) => {
    const res = await api.updateMe(patch);
    setUser(res.user);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // 1. Web URL session_id detection (Emergent Google redirect)
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const hash = window.location.hash || "";
          const search = window.location.search || "";
          let sid: string | null = null;
          if (hash.includes("session_id=")) {
            sid = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
          } else if (search.includes("session_id=")) {
            sid = new URLSearchParams(search).get("session_id");
          }
          if (sid) {
            try {
              const r = await fetch("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", {
                headers: { "X-Session-ID": sid },
              });
              if (r.ok) {
                const data = await r.json();
                if (data.session_token) {
                  await signInWithSessionToken(data.session_token);
                }
              }
            } catch {}
            window.history.replaceState(null, "", window.location.pathname);
          }
        }

        // 2. Cold-start deep link on mobile
        if (Platform.OS !== "web") {
          const initial = await Linking.getInitialURL();
          if (initial && initial.includes("session_id=")) {
            const url = new URL(initial.replace("#", "?"));
            const sid = url.searchParams.get("session_id");
            if (sid) {
              try {
                const r = await fetch("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", {
                  headers: { "X-Session-ID": sid },
                });
                if (r.ok) {
                  const data = await r.json();
                  if (data.session_token) {
                    await signInWithSessionToken(data.session_token);
                  }
                }
              } catch {}
            }
          }
        }

        // 3. Existing stored token
        const stored = await storage.secureGet<string>(TOKEN_KEY, "");
        if (stored) {
          setToken(stored);
          try {
            const { user } = await api.me();
            setUser(user);
          } catch {
            await storage.secureRemove(TOKEN_KEY);
            setToken(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [signInWithSessionToken]);

  return (
    <AuthCtx.Provider
      value={{
        loading,
        user,
        token,
        signInEmail,
        signUpEmail,
        signInWithSessionToken,
        refresh,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
