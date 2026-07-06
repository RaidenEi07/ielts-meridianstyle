"use client";

import type { QuestionDragItem } from "@/lib/types";

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
  function update(i: number, patch: Partial<QuestionDragItem>) {
    onItemsChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    onItemsChange([
      ...items,
      { id: null, content: "", correctTarget: String(items.length + 1), sortOrder: items.length },
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
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các mục kéo-thả ("Vị trí đúng" khớp với số trong mẫu câu)
        </span>
        {items.map((it, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={it.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder="Nội dung mục"
              className="input flex-1 text-sm"
            />
            <input
              value={it.correctTarget}
              onChange={(e) => update(i, { correctTarget: e.target.value })}
              placeholder="Vị trí đúng (vd: 1)"
              className="input w-32 text-sm"
            />
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
