"use client";

import type { QuestionDragItem } from "@/lib/types";

function detectBlanks(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(/\[\[(\d+)\]\]/g)) {
    found.add(m[1]);
  }
  return [...found].sort((a, b) => Number(a) - Number(b));
}

export function DragDropTextForm({
  template,
  onTemplateChange,
  items,
  onItemsChange,
}: {
  template: string;
  onTemplateChange: (v: string) => void;
  items: QuestionDragItem[];
  onItemsChange: (v: QuestionDragItem[]) => void;
}) {
  const blanks = detectBlanks(template);

  function update(i: number, patch: Partial<QuestionDragItem>) {
    onItemsChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    onItemsChange([
      ...items,
      { id: null, content: "", correctTarget: blanks[0] ?? "", sortOrder: items.length },
    ]);
  }
  function removeItem(i: number) {
    onItemsChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Mẫu câu — dùng <code>[[1]]</code>, <code>[[2]]</code>… để đánh dấu chỗ trống
        </span>
        <textarea
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          rows={2}
          placeholder="The [[1]] orbits the [[2]]."
          className="input text-sm"
        />
      </label>
      <p className="text-xs text-muted">
        {blanks.length > 0
          ? `Đã phát hiện ${blanks.length} ô trống: ${blanks.map((b) => `[[${b}]]`).join(", ")}`
          : "Chưa phát hiện ô trống nào — dùng [[1]], [[2]]… trong mẫu câu ở trên."}
      </p>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các mục kéo-thả — chọn ô trống mà mục này là đáp án đúng, hoặc để làm mồi nhử
        </span>
        {items.map((it, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={it.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder="Nội dung mục"
              className="input flex-1 text-sm"
            />
            <select
              value={it.correctTarget}
              onChange={(e) => update(i, { correctTarget: e.target.value })}
              className="input w-48 text-sm"
            >
              <option value="">— Mồi nhử (không dùng) —</option>
              {blanks.map((b) => (
                <option key={b} value={b}>
                  Ô trống [[{b}]]
                </option>
              ))}
              {it.correctTarget && !blanks.includes(it.correctTarget) && (
                <option value={it.correctTarget}>
                  Ô trống [[{it.correctTarget}]] (không còn trong mẫu câu)
                </option>
              )}
            </select>
            <button type="button" onClick={() => removeItem(i)} className="text-xs text-red">
              Xóa
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-sm font-semibold text-accent">
          + Thêm mục
        </button>
      </div>
    </div>
  );
}
