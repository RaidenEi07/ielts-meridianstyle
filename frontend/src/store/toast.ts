"use client";

import { useMemo } from "react";
import { create } from "zustand";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  /**
   * Cùng dedupeKey thì thông báo mới THAY thông báo cũ thay vì chồng thêm (vd cảnh báo lặp lại nhiều lần liên tiếp).
   * Không đặt tên `key` vì sẽ trùng prop `key` đặc biệt của React khi rải `{...toast}` vào JSX.
   */
  dedupeKey?: string;
}

/** Số thông báo hiện cùng lúc tối đa; thông báo cũ nhất bị bỏ khi vượt, để chồng thông báo không lan rộng che giao diện. */
const MAX_VISIBLE = 4;

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string, dedupeKey?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (type, message, dedupeKey) => {
    const id = nextId++;
    set((s) => ({
      toasts: [
        ...(dedupeKey ? s.toasts.filter((t) => t.dedupeKey !== dedupeKey) : s.toasts),
        { id, type, message, dedupeKey },
      ].slice(-MAX_VISIBLE),
    }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Trả về object ổn định qua các lần render (an toàn để đưa vào dependency array). */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return useMemo(
    () => ({
      success: (message: string, dedupeKey?: string) => push("success", message, dedupeKey),
      error: (message: string, dedupeKey?: string) => push("error", message, dedupeKey),
    }),
    [push],
  );
}
