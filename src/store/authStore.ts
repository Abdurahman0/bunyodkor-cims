import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  permissions: string[];
  /**
   * True when the logged-in account is read-only (e.g. CEO). Drives a global
   * gate that hides every write control regardless of the permissions array.
   */
  isReadOnly: boolean;
  setAuth: (
    token: string,
    refreshToken: string,
    user: User,
    permissions: string[],
    isReadOnly?: boolean,
  ) => void;
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
      isReadOnly: false,
      setAuth: (token, refreshToken, user, permissions, isReadOnly = false) =>
        set({ token, refreshToken, user, permissions, isReadOnly }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          permissions: [],
          isReadOnly: false,
        });
        // Navigate to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }),
    { name: "bunyodkor-storage" }
  )
);
