"use client";

import type { QuestionDragItem, QuestionDragZone } from "@/lib/types";
import { DragZoneEditor } from "@/components/DragZoneEditor";

export function DragDropMarkerForm({
  backgroundImageUrl,
  onBackgroundImageUrlChange,
  items,
  onItemsChange,
  zones,
  onZonesChange,
}: {
  backgroundImageUrl: string;
  onBackgroundImageUrlChange: (v: string) => void;
  items: QuestionDragItem[];
  onItemsChange: (v: QuestionDragItem[]) => void;
  zones: QuestionDragZone[];
  onZonesChange: (v: QuestionDragZone[]) => void;
}) {
  const zoneLabels = zones.map((z) => z.label).filter(Boolean);

  function updateItem(i: number, patch: Partial<QuestionDragItem>) {
    onItemsChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    onItemsChange([
      ...items,
      { id: null, content: "", correctTarget: zoneLabels[0] ?? "", sortOrder: items.length },
    ]);
  }
  function removeItem(i: number) {
    onItemsChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">URL ảnh nền</span>
        <input
          value={backgroundImageUrl}
          onChange={(e) => onBackgroundImageUrlChange(e.target.value)}
          placeholder="/img/campus-map.png"
          className="input text-sm"
        />
      </label>

      <DragZoneEditor
        key={backgroundImageUrl}
        backgroundImageUrl={backgroundImageUrl}
        zones={zones}
        onZonesChange={onZonesChange}
      />

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các mục kéo-thả — chọn vùng mà mục này là đáp án đúng, hoặc để làm mồi nhử
        </span>
        {items.map((it, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={it.content}
              onChange={(e) => updateItem(i, { content: e.target.value })}
              placeholder="Nội dung mục"
              className="input flex-1 text-sm"
            />
            <select
              value={it.correctTarget}
              onChange={(e) => updateItem(i, { correctTarget: e.target.value })}
              className="input w-48 text-sm"
            >
              <option value="">— Mồi nhử (không dùng) —</option>
              {zoneLabels.map((label) => (
                <option key={label} value={label}>
                  Vùng {label}
                </option>
              ))}
              {it.correctTarget && !zoneLabels.includes(it.correctTarget) && (
                <option value={it.correctTarget}>
                  Vùng {it.correctTarget} (không còn trong danh sách vùng)
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
