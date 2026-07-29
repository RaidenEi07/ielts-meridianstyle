"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useToastStore, type ToastItem } from "@/store/toast";

const AUTO_DISMISS_MS = 3500;

function ToastRow({ id, type, message }: ToastItem) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  const Icon = type === "success" ? CheckCircle2 : XCircle;
  return (
    <div
      role="status"
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        type === "success"
          ? "border-green bg-green-soft text-green"
          : "border-red bg-red-soft text-red"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 whitespace-pre-wrap">{message}</p>
      <button
        type="button"
        onClick={() => dismiss(id)}
        className="shrink-0 opacity-70 hover:opacity-100"
        title="Đóng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((t) => (
        <ToastRow key={t.id} {...t} />
      ))}
    </div>
  );
}
