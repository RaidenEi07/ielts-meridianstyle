"use client";

import { AlertTriangle } from "lucide-react";
import { useConfirmStore } from "@/store/confirm";

export function ConfirmDialogHost() {
  const request = useConfirmStore((s) => s.request);
  const answer = useConfirmStore((s) => s.answer);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
      onClick={() => answer(false)}
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red" />
          <h2 className="text-base font-semibold">{request.title ?? "Xác nhận"}</h2>
        </div>
        <p className="mb-5 whitespace-pre-wrap text-sm text-muted">{request.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text"
          >
            {request.cancelLabel ?? "Hủy"}
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              request.danger === false ? "bg-primary" : "bg-red"
            }`}
          >
            {request.confirmLabel ?? "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
