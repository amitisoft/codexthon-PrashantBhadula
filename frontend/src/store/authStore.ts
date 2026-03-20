import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/api";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (input: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => {
        localStorage.setItem("pft-access-token", accessToken);
        set({ accessToken, refreshToken, user });
      },
      clearSession: () => {
        localStorage.removeItem("pft-access-token");
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: "pft-auth",
    },
  ),
);
