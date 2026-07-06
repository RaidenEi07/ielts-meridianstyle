"use client";

import type { QuestionDragItem, QuestionDragZone } from "@/lib/types";

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
  function updateItem(i: number, patch: Partial<QuestionDragItem>) {
    onItemsChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    onItemsChange([...items, { id: null, content: "", correctTarget: "", sortOrder: items.length }]);
  }
  function removeItem(i: number) {
    onItemsChange(items.filter((_, idx) => idx !== i));
  }

  function updateZone(i: number, patch: Partial<QuestionDragZone>) {
    onZonesChange(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));
  }
  function addZone() {
    onZonesChange([
      ...zones,
      { id: null, label: "", x: 0, y: 0, width: 80, height: 40, sortOrder: zones.length },
    ]);
  }
  function removeZone(i: number) {
    onZonesChange(zones.filter((_, idx) => idx !== i));
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

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Vùng thả trên ảnh (tọa độ pixel)
        </span>
        {zones.map((z, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={z.label}
              onChange={(e) => updateZone(i, { label: e.target.value })}
              placeholder="Nhãn (vd: A)"
              className="input w-20 text-sm"
            />
            <input
              type="number"
              value={z.x}
              onChange={(e) => updateZone(i, { x: Number(e.target.value) })}
              placeholder="x"
              className="input w-16 text-sm"
            />
            <input
              type="number"
              value={z.y}
              onChange={(e) => updateZone(i, { y: Number(e.target.value) })}
              placeholder="y"
              className="input w-16 text-sm"
            />
            <input
              type="number"
              value={z.width}
              onChange={(e) => updateZone(i, { width: Number(e.target.value) })}
              placeholder="rộng"
              className="input w-16 text-sm"
            />
            <input
              type="number"
              value={z.height}
              onChange={(e) => updateZone(i, { height: Number(e.target.value) })}
              placeholder="cao"
              className="input w-16 text-sm"
            />
            <button type="button" onClick={() => removeZone(i)} className="text-xs text-red">
              Xóa
            </button>
          </div>
        ))}
        <button type="button" onClick={addZone} className="text-sm font-semibold text-accent">
          + Thêm vùng
        </button>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Các mục kéo-thả ("Nhãn vùng đúng" khớp với nhãn vùng ở trên)
        </span>
        {items.map((it, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={it.content}
              onChange={(e) => updateItem(i, { content: e.target.value })}
              placeholder="Nội dung mục"
              className="input flex-1 text-sm"
            />
            <input
              value={it.correctTarget}
              onChange={(e) => updateItem(i, { correctTarget: e.target.value })}
              placeholder="Nhãn vùng đúng (vd: A)"
              className="input w-40 text-sm"
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
