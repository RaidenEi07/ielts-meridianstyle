"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ApiError,
  authApi,
  configureLiveToken,
  configureTokenRefresher,
  familyApi,
} from "@/lib/api";
import type { MeResponse, RoleAssignment, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  /**
   * Token của PHIÊN: chỉ đổi khi đăng nhập/đăng ký/đổi tài khoản/đăng xuất, KHÔNG đổi khi access token được làm
   * mới ngầm. Nhiều trang đặt nó (qua `token`) vào deps của useEffect để tải dữ liệu; nếu nó đổi mỗi 15 phút thì
   * các effect đó chạy lại và đặt lại state — bài làm đang làm dở, câu hỏi đang soạn, ván game... mất theo.
   * Đừng dùng giá trị này để gọi API trực tiếp: luôn đi qua apiFetch, nơi tự thay bằng `liveAccessToken`.
   */
  accessToken: string | null;
  /** Access token đang hiệu lực (mới nhất sau mỗi lần làm mới ngầm). Rỗng thì dùng `accessToken`. */
  liveAccessToken: string | null;
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

/** Access token đang hiệu lực của phiên hiện tại. */
const liveTokenOf = (s: Pick<AuthState, "accessToken" | "liveAccessToken">) =>
  s.liveAccessToken ?? s.accessToken;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      liveAccessToken: null,
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
          liveAccessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        await get().loadMe();
      },

      register: async (username, email, password, fullName) => {
        const res = await authApi.register(username, email, password, fullName);
        set({
          user: res.user,
          accessToken: res.accessToken,
          liveAccessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        await get().loadMe();
      },

      registerParent: async (username, email, password, fullName) => {
        const res = await authApi.registerParent(username, email, password, fullName);
        set({
          user: res.user,
          accessToken: res.accessToken,
          liveAccessToken: res.accessToken,
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
          liveAccessToken: null,
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
          parentAccessToken: liveTokenOf(get()),
          parentRefreshToken: get().refreshToken,
          activeChildId: childId,
          user: res.user,
          accessToken: res.accessToken,
          liveAccessToken: res.accessToken,
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
          liveAccessToken: parentAccessToken,
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
        liveAccessToken: s.liveAccessToken,
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

// apiFetch luôn gửi token đang hiệu lực, bất kể token component đang cầm là gì (xem lib/api.ts).
configureLiveToken(() => liveTokenOf(useAuthStore.getState()));

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const rt = useAuthStore.getState().refreshToken;
  if (!rt) return null;
  try {
    const res = await authApi.refresh(rt);
    // Chỉ đổi token đang hiệu lực + refresh token; `accessToken` của phiên giữ nguyên (xem chú thích ở AuthState).
    useAuthStore.setState({ liveAccessToken: res.accessToken, refreshToken: res.refreshToken });
    return res.accessToken;
  } catch (err) {
    // Chỉ đăng xuất khi máy chủ nói rõ refresh token không dùng được (hết hạn, sai, tài khoản bị khóa). Rớt mạng
    // hay lỗi máy chủ tạm thời thì giữ nguyên phiên: đang làm bài mà bị văng ra trang đăng nhập vì một lần mất
    // kết nối thoáng qua là quá đắt. Request đang chờ sẽ nhận lỗi 401 gốc và tự thử lại ở lần sau.
    if (err instanceof ApiError && [400, 401, 403].includes(err.status)) {
      useAuthStore.getState().logout();
    }
    return null;
  }
}

// Khi access token hết hạn (401), tự làm mới bằng refresh token. Nhiều request cùng gặp 401 một lúc (đang gõ đáp
// án, nhiều ô tải dữ liệu...) dùng chung MỘT lần làm mới thay vì mỗi request tự gọi một lần.
configureTokenRefresher(() => {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
});
