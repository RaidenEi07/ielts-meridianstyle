"use client";

import { RichTextEditor } from "@/components/RichTextEditor";
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
  templateHeading,
  onTemplateHeadingChange,
  bankHeading,
  onBankHeadingChange,
  items,
  onItemsChange,
  token,
}: {
  template: string;
  onTemplateChange: (v: string) => void;
  templateHeading: string;
  onTemplateHeadingChange: (v: string) => void;
  bankHeading: string;
  onBankHeadingChange: (v: string) => void;
  items: QuestionDragItem[];
  onItemsChange: (v: QuestionDragItem[]) => void;
  /** Cho trình soạn thảo đầy đủ (in đậm/nghiêng, chèn ảnh…) — [[1]], [[2]]…
   * vẫn gõ là văn bản thường ngay trong đó, không cần cú pháp riêng. */
  token: string;
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
          Tiêu đề danh sách (tùy chọn) — chỉ cần khi mẫu câu thực ra là 1 danh sách mục cần gắn nhãn
          chung, vd &ldquo;Businesses&rdquo;. Để trống với câu điền khuyết thông thường.
        </span>
        <input
          value={templateHeading}
          onChange={(e) => onTemplateHeadingChange(e.target.value)}
          placeholder="VD: Businesses"
          className="input text-sm"
        />
      </label>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Mẫu câu — dùng <code>[[1]]</code>, <code>[[2]]</code>… để đánh dấu chỗ trống (gõ ngay
          trong nội dung, có thể định dạng in đậm/nghiêng/chèn ảnh như văn bản thường)
        </span>
        <RichTextEditor value={template} onChange={onTemplateChange} token={token} />
      </div>
      <p className="text-xs text-muted">
        {blanks.length > 0
          ? `Đã phát hiện ${blanks.length} ô trống: ${blanks.map((b) => `[[${b}]]`).join(", ")}`
          : "Chưa phát hiện ô trống nào — dùng [[1]], [[2]]… trong mẫu câu ở trên."}
      </p>
      <div>
        <label className="mb-2 block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Tiêu đề khối đáp án (tùy chọn) — nhãn chung cho các mục kéo-thả bên dưới, vd
            &ldquo;Comments&rdquo;.
          </span>
          <input
            value={bankHeading}
            onChange={(e) => onBankHeadingChange(e.target.value)}
            placeholder="VD: Comments"
            className="input text-sm"
          />
        </label>
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
