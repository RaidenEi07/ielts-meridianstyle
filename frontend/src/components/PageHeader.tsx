"use client";

import Link from "next/link";
import { Move } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEditModeStore } from "@/store/editMode";

export function PageHeader({
  title,
  backHref,
  backLabel,
  maxWidthClass = "max-w-6xl",
  showEditModeToggle = false,
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
  maxWidthClass?: string;
  showEditModeToggle?: boolean;
}) {
  const { enabled, toggle } = useEditModeStore();

  return (
    <header className="border-b border-border bg-surface">
      <div className={`mx-auto flex ${maxWidthClass} items-center justify-between px-6 py-4`}>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Logo />
          </Link>
          {title && (
            <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted">
              {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showEditModeToggle && (
            <button
              type="button"
              onClick={toggle}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                enabled
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              <Move className="h-4 w-4" />
              Chế độ chỉnh sửa: {enabled ? "Bật" : "Tắt"}
            </button>
          )}
          <ThemeToggle />
          {backHref && (
            <Link
              href={backHref}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text"
            >
              ← {backLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
