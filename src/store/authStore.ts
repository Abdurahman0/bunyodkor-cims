import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[];
  setAuth: (token: string, user: User, permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      setAuth: (token, user, permissions) => set({ token, user, permissions }),
      logout: () => {
        set({ token: null, user: null, permissions: [] });
        // Navigate to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }),
    { name: "bunyodkor-storage" }
  )
);
