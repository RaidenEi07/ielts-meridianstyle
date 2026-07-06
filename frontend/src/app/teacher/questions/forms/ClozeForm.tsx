"use client";

import type { QuestionClozeSubAnswer } from "@/lib/types";

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function ClozeForm({
  value,
  onChange,
}: {
  value: QuestionClozeSubAnswer[];
  onChange: (v: QuestionClozeSubAnswer[]) => void;
}) {
  function update(i: number, patch: Partial<QuestionClozeSubAnswer>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addRow() {
    onChange([
      ...value,
      {
        id: null,
        subIndex: value.length + 1,
        subType: "TEXT",
        acceptedAnswers: [],
        options: null,
        sortOrder: value.length,
      },
    ]);
  }
  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        Đặt các mốc <code>{"{1}"}</code>, <code>{"{2}"}</code>… trong ô "Nội dung câu hỏi" bên trên,
        khớp với "Số thứ tự" của mỗi ô trả lời dưới đây.
      </p>
      {value.map((c, i) => (
        <div key={i} className="rounded-lg border border-border p-2">
          <div className="mb-2 flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted">
              Số thứ tự
              <input
                type="number"
                value={c.subIndex}
                onChange={(e) => update(i, { subIndex: Number(e.target.value) })}
                className="input w-16 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted">
              Loại
              <select
                value={c.subType}
                onChange={(e) => update(i, { subType: e.target.value })}
                className="input text-sm"
              >
                <option value="TEXT">Nhập chữ</option>
                <option value="SELECT">Chọn từ danh sách</option>
              </select>
            </label>
            <button type="button" onClick={() => removeRow(i)} className="ml-auto text-xs text-red">
              Xóa
            </button>
          </div>
          <input
            value={(c.acceptedAnswers ?? []).join(", ")}
            onChange={(e) => update(i, { acceptedAnswers: splitCsv(e.target.value) })}
            placeholder="Đáp án chấp nhận, cách nhau bởi dấu phẩy"
            className="input mb-1 w-full text-sm"
          />
          {c.subType === "SELECT" && (
            <input
              value={(c.options ?? []).join(", ")}
              onChange={(e) => update(i, { options: splitCsv(e.target.value) })}
              placeholder="Các lựa chọn hiển thị, cách nhau bởi dấu phẩy"
              className="input w-full text-sm"
            />
          )}
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
        + Thêm ô trả lời
      </button>
    </div>
  );
}
