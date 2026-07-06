"use client";

import type { QuestionOption } from "@/lib/types";

export function OptionListForm({
  value,
  onChange,
}: {
  value: QuestionOption[];
  onChange: (v: QuestionOption[]) => void;
}) {
  function update(i: number, patch: Partial<QuestionOption>) {
    onChange(value.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function addRow() {
    onChange([
      ...value,
      { id: null, content: "", correct: false, feedback: null, sortOrder: value.length },
    ]);
  }
  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <span className="mb-1 block text-xs font-medium text-muted">
        Các lựa chọn (tick ô bên trái cho đáp án đúng)
      </span>
      {value.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={o.correct}
            onChange={(e) => update(i, { correct: e.target.checked })}
            title="Đáp án đúng"
          />
          <input
            value={o.content}
            onChange={(e) => update(i, { content: e.target.value })}
            placeholder={`Lựa chọn ${i + 1}`}
            className="input flex-1 text-sm"
          />
          <button type="button" onClick={() => removeRow(i)} className="text-xs text-red">
            Xóa
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
        + Thêm lựa chọn
      </button>
    </div>
  );
}
