"use client";

import { useEffect, useId } from "react";

/** Hộp thoại giữa màn hình dùng chung: đóng bằng Esc, bấm nền mờ hoặc nút ×. */
export function Dialog({
  title,
  onClose,
  children,
  widthClass = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      data-testid="Dialog"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-full w-full ${widthClass} overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md px-2 text-xl leading-none text-muted hover:text-text"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
