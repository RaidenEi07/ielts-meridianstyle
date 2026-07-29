"use client";

import { useState } from "react";

export interface BulkRenameItem {
  id: number;
  label: string;
}

/** Thay `{n}` bằng số thứ tự (bắt đầu từ 1) theo đúng thứ tự hiển thị hiện tại. */
function applyPattern(pattern: string, index: number): string {
  return pattern.replace(/\{n\}/g, String(index + 1));
}

export function BulkRenameDialog({
  items,
  onApply,
  onClose,
  title = "Đổi tên hàng loạt",
}: {
  items: BulkRenameItem[];
  onApply: (renames: { id: number; name: string }[]) => Promise<void>;
  onClose: () => void;
  title?: string;
}) {
  const [pattern, setPattern] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewCount = Math.min(3, items.length);
  const preview = items
    .slice(0, previewCount)
    .map((item, i) => applyPattern(pattern, i))
    .filter(Boolean);

  async function handleApply() {
    if (!pattern.trim()) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(items.map((item, i) => ({ id: item.id, name: applyPattern(pattern, i) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi tên hàng loạt thất bại");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
      onClick={() => !applying && onClose()}
    >
      <div
        className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted">
          Áp dụng cho {items.length} mục đã chọn, theo đúng thứ tự đang hiển thị. Dùng{" "}
          <code className="rounded bg-soft px-1 py-0.5 text-xs">{"{n}"}</code> để tự đánh số.
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Mẫu tên</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Vd: Đề thi thử {n}"
            className="input"
            autoFocus
          />
        </label>

        {pattern.trim() && (
          <div className="mt-3 rounded-lg bg-soft p-3 text-xs text-muted">
            <p className="mb-1 font-medium">Xem trước:</p>
            <ul className="space-y-0.5">
              {preview.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
              {items.length > previewCount && <li>… và {items.length - previewCount} mục khác</li>}
            </ul>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !pattern.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {applying ? "Đang áp dụng…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}
