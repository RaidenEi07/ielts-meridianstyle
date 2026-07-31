"use client";

import type { PlayerDragItem } from "@/lib/types";

/**
 * Dropdown-chọn cho DRAG_DROP_TEXT (Academic/IELTS) — thay cho kéo-thả chip
 * (vốn dựng cho Trẻ em) để khớp cách IELTS CD thật hiện các dạng matching
 * (Matching Features, Sentence/Summary Completion...). Cùng shape dữ liệu
 * `placements: {itemId: targetLabel}` với bản kéo-thả cũ nên không đổi gì ở
 * chấm điểm (gradeDragDropText).
 */
export function TextDragDropDropdown({
  template,
  dragItems,
  answer,
  onChange,
}: {
  template: string;
  dragItems: PlayerDragItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  onChange: (r: { placements: Record<string, string> }) => void;
}) {
  const placements: Record<string, string> = answer?.placements ?? {};
  const parts = template.split(/\[\[(\d+)\]\]/);

  function handleSelect(targetLabel: string, itemId: string) {
    const next = { ...placements };
    Object.keys(next).forEach((id) => {
      if (next[id] === targetLabel || id === itemId) delete next[id];
    });
    if (itemId) next[itemId] = targetLabel;
    onChange({ placements: next });
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-8">
      {parts.map((part, i) => {
        if (i % 2 === 0) return <span key={i}>{part}</span>;
        const targetLabel = part;
        const selectedItemId =
          Object.keys(placements).find((id) => placements[id] === targetLabel) ?? "";
        return (
          <select
            key={i}
            value={selectedItemId}
            onChange={(e) => handleSelect(targetLabel, e.target.value)}
            className="input mx-1 inline-block w-auto align-middle text-sm"
          >
            <option value="">— Chọn —</option>
            {dragItems.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.content}
              </option>
            ))}
          </select>
        );
      })}
    </p>
  );
}
