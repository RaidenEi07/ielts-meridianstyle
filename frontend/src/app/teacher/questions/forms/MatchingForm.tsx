"use client";

import type { QuestionMatchingPair } from "@/lib/types";

export function MatchingForm({
  value,
  onChange,
}: {
  value: QuestionMatchingPair[];
  onChange: (v: QuestionMatchingPair[]) => void;
}) {
  function update(i: number, patch: Partial<QuestionMatchingPair>) {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addRow() {
    onChange([...value, { id: null, leftItem: "", rightItem: "", sortOrder: value.length }]);
  }
  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <span className="mb-1 block text-xs font-medium text-muted">
        Các cặp nối (vế trái ↔ vế phải là đáp án đúng)
      </span>
      {value.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
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
          <button type="button" onClick={() => removeRow(i)} className="text-xs text-red">
            Xóa
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
        + Thêm cặp
      </button>
    </div>
  );
}
