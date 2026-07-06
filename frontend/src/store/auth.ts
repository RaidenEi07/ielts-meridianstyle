"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, configureTokenRefresher } from "@/lib/api";
import type { MeResponse, RoleAssignment, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  roleAssignments: RoleAssignment[];
  systemCapabilities: string[];
  /** Đã hydrate xong từ localStorage chưa (tránh nháy khi load lại). */
  hydrated: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
  hasCapability: (capability: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      roleAssignments: [],
      systemCapabilities: [],
      hydrated: false,

      login: async (username, password) => {
        const res = await authApi.login(username, password);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        await get().loadMe();
      },

      register: async (username, email, password, fullName) => {
        const res = await authApi.register(username, email, password, fullName);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        await get().loadMe();
      },

      loadMe: async () => {
        const token = get().accessToken;
        if (!token) return;
        const me: MeResponse = await authApi.me(token);
        set({
          user: me.user,
          roleAssignments: me.roleAssignments,
          systemCapabilities: me.systemCapabilities,
        });
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          roleAssignments: [],
          systemCapabilities: [],
        }),

      hasCapability: (capability) =>
        get().systemCapabilities.includes(capability),
    }),
    {
      name: "meridian-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

// Khi access token hết hạn (401), tự làm mới bằng refresh token.
configureTokenRefresher(async () => {
  const rt = useAuthStore.getState().refreshToken;
  if (!rt) return null;
  try {
    const res = await authApi.refresh(rt);
    useAuthStore.setState({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
    return res.accessToken;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
});
