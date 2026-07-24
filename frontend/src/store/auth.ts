"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, configureTokenRefresher, familyApi } from "@/lib/api";
import type { MeResponse, RoleAssignment, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  roleAssignments: RoleAssignment[];
  systemCapabilities: string[];
  /** Deployment này là "web tổng" (điều phối khóa học) hay "web con" (mặc định false). */
  isMaster: boolean;
  /** Đã hydrate xong từ localStorage chưa (tránh nháy khi load lại). */
  hydrated: boolean;

  /** Token của phụ huynh, giữ lại khi đang "học cùng con" để quay lại không cần đăng nhập lại. */
  parentAccessToken: string | null;
  parentRefreshToken: string | null;
  activeChildId: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  registerParent: (
    username: string,
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
  hasCapability: (capability: string) => boolean;
  switchToChild: (childId: string) => Promise<void>;
  switchBackToParent: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      roleAssignments: [],
      systemCapabilities: [],
      isMaster: false,
      hydrated: false,
      parentAccessToken: null,
      parentRefreshToken: null,
      activeChildId: null,

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

      registerParent: async (username, email, password, fullName) => {
        const res = await authApi.registerParent(username, email, password, fullName);
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
          isMaster: me.isMaster,
        });
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          roleAssignments: [],
          systemCapabilities: [],
          isMaster: false,
          parentAccessToken: null,
          parentRefreshToken: null,
          activeChildId: null,
        }),

      hasCapability: (capability) =>
        get().systemCapabilities.includes(capability),

      switchToChild: async (childId) => {
        const token = get().accessToken;
        if (!token) return;
        const res = await familyApi.switchToChild(token, childId);
        set({
          parentAccessToken: get().accessToken,
          parentRefreshToken: get().refreshToken,
          activeChildId: childId,
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        await get().loadMe();
      },

      switchBackToParent: async () => {
        const parentAccessToken = get().parentAccessToken;
        const parentRefreshToken = get().parentRefreshToken;
        if (!parentAccessToken || !parentRefreshToken) return;
        set({
          accessToken: parentAccessToken,
          refreshToken: parentRefreshToken,
          parentAccessToken: null,
          parentRefreshToken: null,
          activeChildId: null,
        });
        await get().loadMe();
      },
    }),
    {
      name: "meridian-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        parentAccessToken: s.parentAccessToken,
        parentRefreshToken: s.parentRefreshToken,
        activeChildId: s.activeChildId,
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
