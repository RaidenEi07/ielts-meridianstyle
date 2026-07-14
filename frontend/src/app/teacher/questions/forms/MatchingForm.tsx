"use client";

import { ImageUploadField } from "@/components/ImageUploadField";
import type { QuestionMatchingPair } from "@/lib/types";

export function MatchingForm({
  value,
  onChange,
  showImages,
  token,
}: {
  value: QuestionMatchingPair[];
  onChange: (v: QuestionMatchingPair[]) => void;
  showImages?: boolean;
  token?: string;
}) {
  function update(i: number, patch: Partial<QuestionMatchingPair>) {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addRow() {
    onChange([
      ...value,
      {
        id: null,
        leftItem: "",
        rightItem: "",
        sortOrder: value.length,
        leftImageUrl: null,
        rightImageUrl: null,
      },
    ]);
  }
  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <span className="mb-1 block text-xs font-medium text-muted">
        Các cặp nối (vế trái ↔ vế phải là đáp án đúng)
      </span>
      {value.map((p, i) => (
        <div
          key={i}
          className={showImages ? "space-y-2 rounded-lg border border-border p-3" : "flex items-center gap-2"}
        >
          <div className="flex items-center gap-2">
            <input
              value={p.leftItem}
              onChange={(e) => update(i, { leftItem: e.target.value })}
              placeholder="Vế trái"
              className="input flex-1 text-sm"
            />
            <span className="text-muted">↔</span>
            <input
              value={p.rightItem}
              onChange={(e) => update(i, { rightItem: e.target.value })}
              placeholder="Vế phải (đáp án đúng)"
              className="input flex-1 text-sm"
            />
            <button type="button" onClick={() => removeRow(i)} className="shrink-0 text-xs text-red">
              Xóa
            </button>
          </div>
          {showImages && token && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageUploadField
                token={token}
                value={p.leftImageUrl}
                onChange={(url) => update(i, { leftImageUrl: url })}
                label="Ảnh vế trái (tùy chọn)"
              />
              <ImageUploadField
                token={token}
                value={p.rightImageUrl}
                onChange={(url) => update(i, { rightImageUrl: url })}
                label="Ảnh vế phải (tùy chọn)"
              />
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
        + Thêm cặp
      </button>
    </div>
  );
}
