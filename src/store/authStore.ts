import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  permissions: string[];
  setAuth: (token: string, refreshToken: string, user: User, permissions: string[]) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      permissions: [],
      setAuth: (token, refreshToken, user, permissions) => set({ token, refreshToken, user, permissions }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ token: null, refreshToken: null, user: null, permissions: [] });
        // Navigate to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }),
    { name: "bunyodkor-storage" }
  )
);
