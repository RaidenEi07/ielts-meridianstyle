"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationApi } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export function NotificationBell() {
  const token = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!hydrated || !token) return;
    notificationApi.unreadCount(token).then((r) => setCount(r.count)).catch(() => {});
  }, [hydrated, token]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && token) {
      const list = await notificationApi.me(token).catch(() => []);
      setItems(list);
    }
  }

  async function markAll() {
    if (!token) return;
    await notificationApi.markAllRead(token).catch(() => {});
    setCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (!hydrated || !token) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Thông báo"
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-text"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 rounded-lg border border-border bg-surface shadow-[0_16px_40px_-10px_rgba(38,33,27,.22)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Thông báo</span>
            {count > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-accent">
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Chưa có thông báo.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-border px-4 py-3 last:border-0 ${
                    n.read ? "opacity-60" : "bg-soft/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
