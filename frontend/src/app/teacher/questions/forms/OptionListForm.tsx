"use client";

import type { QuestionOption } from "@/lib/types";

export function OptionListForm({
  value,
  onChange,
  singleAnswer,
  onSingleAnswerChange,
}: {
  value: QuestionOption[];
  onChange: (v: QuestionOption[]) => void;
  singleAnswer?: boolean;
  onSingleAnswerChange?: (v: boolean) => void;
}) {
  function update(i: number, patch: Partial<QuestionOption>) {
    onChange(value.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function markCorrect(i: number) {
    if (singleAnswer) {
      onChange(value.map((o, idx) => ({ ...o, correct: idx === i })));
    } else {
      update(i, { correct: !value[i].correct });
    }
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
      {onSingleAnswerChange && (
        <label className="mb-1 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={Boolean(singleAnswer)}
            onChange={(e) => onSingleAnswerChange(e.target.checked)}
          />
          Chỉ cho phép chọn 1 đáp án đúng
        </label>
      )}
      <span className="mb-1 block text-xs font-medium text-muted">
        {singleAnswer
          ? "Các lựa chọn (chọn 1 ô bên trái cho đáp án đúng)"
          : "Các lựa chọn (tick ô bên trái cho đáp án đúng)"}
      </span>
      {value.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type={singleAnswer ? "radio" : "checkbox"}
            name={singleAnswer ? "option-correct" : undefined}
            checked={o.correct}
            onChange={() => markCorrect(i)}
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
