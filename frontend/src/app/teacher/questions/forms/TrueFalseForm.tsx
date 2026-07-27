"use client";

import type { QuestionOption } from "@/lib/types";

const PRESETS: [string, string[]][] = [
  ["True / False / Not Given", ["TRUE", "FALSE", "NOT GIVEN"]],
  ["Yes / No / Not Given", ["YES", "NO", "NOT GIVEN"]],
];

/**
 * Form riêng cho Đúng/Sai/Không thể nói — khác Multiple Choice ở chỗ chỉ có
 * ĐÚNG 1 đáp án đúng trong 1 bộ nhỏ cố định, nên dùng radio (không phải
 * checkbox) để không thể tick nhầm nhiều đáp án, và có nút chọn nhanh 2 bộ
 * nhãn chuẩn IELTS thay vì phải tự gõ từng ô.
 */
export function TrueFalseForm({
  value,
  onChange,
}: {
  value: QuestionOption[];
  onChange: (v: QuestionOption[]) => void;
}) {
  function applyPreset(labels: string[]) {
    onChange(
      labels.map((content, i) => ({
        id: value[i]?.id ?? null,
        content,
        correct: value[i]?.content === content ? value[i].correct : false,
        feedback: null,
        sortOrder: i,
      })),
    );
  }

  function setCorrect(i: number) {
    onChange(value.map((o, idx) => ({ ...o, correct: idx === i })));
  }

  function updateContent(i: number, content: string) {
    onChange(value.map((o, idx) => (idx === i ? { ...o, content } : o)));
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
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Chọn nhanh bộ đáp án</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([label, labels]) => (
            <button
              key={label}
              type="button"
              onClick={() => applyPreset(labels)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các lựa chọn (chọn đúng 1 ô tròn cho đáp án đúng)
        </span>
        <div className="space-y-2">
          {value.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="tfng-correct-option"
                checked={o.correct}
                onChange={() => setCorrect(i)}
                title="Đáp án đúng"
              />
              <input
                value={o.content}
                onChange={(e) => updateContent(i, e.target.value)}
                placeholder={`Lựa chọn ${i + 1}`}
                className="input flex-1 text-sm"
              />
              <button type="button" onClick={() => removeRow(i)} className="text-xs text-red">
                Xóa
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="mt-2 text-sm font-semibold text-accent">
          + Thêm lựa chọn
        </button>
      </div>
    </div>
  );
}
