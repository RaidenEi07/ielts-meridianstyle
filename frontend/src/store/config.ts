"use client";

import { create } from "zustand";
import { configApi } from "@/lib/api";

const DEFAULT_SITE_NAME = "Anh ngữ Meridian";
const DEFAULT_TAGLINE = "Hệ thống luyện thi IELTS";

interface ConfigState {
  siteName: string;
  tagline: string;
  loaded: boolean;
  load: () => void;
}

/** Cấu hình công khai (tên/khẩu hiệu thương hiệu) — tải 1 lần, dùng chung toàn site. */
export const useConfigStore = create<ConfigState>()((set, get) => ({
  siteName: DEFAULT_SITE_NAME,
  tagline: DEFAULT_TAGLINE,
  loaded: false,

  load: () => {
    if (get().loaded) return;
    set({ loaded: true });
    configApi
      .getPublic()
      .then((cfg) => {
        const siteName = cfg.SITE_NAME || DEFAULT_SITE_NAME;
        const tagline = cfg.SITE_TAGLINE || DEFAULT_TAGLINE;
        set({ siteName, tagline });
        if (typeof document !== "undefined") {
          document.title = `${siteName} — ${tagline}`;
        }
      })
      .catch(() => {
        set({ loaded: false });
      });
  },
}));
