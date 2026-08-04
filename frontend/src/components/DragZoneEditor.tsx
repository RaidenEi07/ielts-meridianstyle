"use client";

import { useRef, useState } from "react";
import type { QuestionDragZone } from "@/lib/types";

const DISPLAY_MAX_WIDTH = 640;
const MIN_ZONE_SIZE = 12;

function nextLabel(zones: QuestionDragZone[]): string {
  const used = new Set(zones.map((z) => z.label));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return `Z${zones.length + 1}`;
}

type DrawState = { startX: number; startY: number; x: number; y: number; w: number; h: number };
type DragMode =
  | { kind: "move"; index: number; grabDx: number; grabDy: number }
  | { kind: "resize"; index: number };

/** Vẽ/di chuyển/đổi kích thước vùng thả trực tiếp trên ảnh nền — thay cho việc
 * gõ tay 4 số tọa độ pixel không có gì đối chiếu, dễ lệch mà không ai biết
 * cho tới khi học sinh làm bài (đúng lớp lỗi Lát 37 đã giải quyết cho Cloze). */
export function DragZoneEditor({
  backgroundImageUrl,
  zones,
  onZonesChange,
}: {
  backgroundImageUrl: string;
  zones: QuestionDragZone[];
  onZonesChange: (zones: QuestionDragZone[]) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalWidth(img.naturalWidth);
    setScale(Math.min(1, DISPLAY_MAX_WIDTH / img.naturalWidth));
  }

  function relativePoint(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function updateZone(i: number, patch: Partial<QuestionDragZone>) {
    onZonesChange(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));
  }
  function removeZone(i: number) {
    onZonesChange(zones.filter((_, idx) => idx !== i));
    setSelected(null);
  }

  function onContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== containerRef.current && e.target !== imgRef.current) return;
    const p = relativePoint(e.clientX, e.clientY);
    setSelected(null);
    setDraw({ startX: p.x, startY: p.y, x: p.x, y: p.y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onZonePointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    e.stopPropagation();
    setSelected(index);
    const z = zones[index];
    const p = relativePoint(e.clientX, e.clientY);
    setDragMode({ kind: "move", index, grabDx: p.x - z.x * scale, grabDy: p.y - z.y * scale });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onResizeHandlePointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    e.stopPropagation();
    setSelected(index);
    setDragMode({ kind: "resize", index });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const p = relativePoint(e.clientX, e.clientY);
    if (draw) {
      const x = Math.min(draw.startX, p.x);
      const y = Math.min(draw.startY, p.y);
      const w = Math.abs(p.x - draw.startX);
      const h = Math.abs(p.y - draw.startY);
      setDraw({ ...draw, x, y, w, h });
      return;
    }
    if (dragMode?.kind === "move") {
      const z = zones[dragMode.index];
      const nx = Math.max(0, Math.round((p.x - dragMode.grabDx) / scale));
      const ny = Math.max(0, Math.round((p.y - dragMode.grabDy) / scale));
      if (nx !== z.x || ny !== z.y) updateZone(dragMode.index, { x: nx, y: ny });
      return;
    }
    if (dragMode?.kind === "resize") {
      const z = zones[dragMode.index];
      const nw = Math.max(MIN_ZONE_SIZE, Math.round(p.x / scale) - z.x);
      const nh = Math.max(MIN_ZONE_SIZE, Math.round(p.y / scale) - z.y);
      if (nw !== z.width || nh !== z.height) updateZone(dragMode.index, { width: nw, height: nh });
    }
  }

  function onPointerUp() {
    if (draw) {
      if (draw.w >= MIN_ZONE_SIZE && draw.h >= MIN_ZONE_SIZE) {
        const zone: QuestionDragZone = {
          id: null,
          label: nextLabel(zones),
          x: Math.round(draw.x / scale),
          y: Math.round(draw.y / scale),
          width: Math.round(draw.w / scale),
          height: Math.round(draw.h / scale),
          sortOrder: zones.length,
        };
        onZonesChange([...zones, zone]);
        setSelected(zones.length);
      }
      setDraw(null);
    }
    setDragMode(null);
  }

  return (
    <div className="space-y-2">
      <span className="mb-1 block text-xs font-medium text-muted">
        Vùng thả trên ảnh — kéo chuột để vẽ vùng mới, kéo thân để di chuyển, kéo góc dưới-phải để
        đổi kích thước
      </span>
      {backgroundImageUrl && imgError && (
        <p className="rounded-lg border border-red bg-red-soft px-3 py-2 text-sm text-red">
          Không tải được ảnh từ URL này — kiểm tra lại đường dẫn.
        </p>
      )}
      {backgroundImageUrl && !imgError ? (
        <div
          ref={containerRef}
          onPointerDown={onContainerPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative inline-block max-w-full touch-none select-none rounded-lg border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={backgroundImageUrl}
            alt=""
            onLoad={handleImgLoad}
            onError={() => setImgError(true)}
            draggable={false}
            style={{ width: naturalWidth ? naturalWidth * scale : undefined }}
            className="block max-w-full rounded-lg"
          />
          {zones.map((z, i) => (
            <div
              key={i}
              onPointerDown={(e) => onZonePointerDown(e, i)}
              className={`absolute flex cursor-move items-start justify-start rounded border-2 text-xs font-semibold ${
                selected === i
                  ? "border-primary bg-primary-soft/50 text-primary"
                  : "border-accent bg-accent-soft/40 text-accent"
              }`}
              style={{
                left: z.x * scale,
                top: z.y * scale,
                width: z.width * scale,
                height: z.height * scale,
              }}
            >
              <span className="pointer-events-none px-1 py-0.5">{z.label || "?"}</span>
              {selected === i && (
                <div
                  onPointerDown={(e) => onResizeHandlePointerDown(e, i)}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border-2 border-primary bg-surface"
                />
              )}
            </div>
          ))}
          {draw && (
            <div
              className="absolute rounded border-2 border-dashed border-primary bg-primary-soft/30"
              style={{ left: draw.x, top: draw.y, width: draw.w, height: draw.h }}
            />
          )}
        </div>
      ) : !backgroundImageUrl ? (
        <p className="text-sm text-muted">Nhập URL ảnh nền ở trên để bắt đầu vẽ vùng thả.</p>
      ) : null}

      {zones.length > 0 && (
        <div className="space-y-1">
          {zones.map((z, i) => (
            <div
              key={i}
              onClick={() => setSelected(i)}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${
                selected === i ? "bg-primary-soft" : ""
              }`}
            >
              <input
                value={z.label}
                onChange={(e) => updateZone(i, { label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Nhãn (vd: A)"
                className="input w-20 text-sm"
              />
              {(
                [
                  ["x", "x"],
                  ["y", "y"],
                  ["width", "rộng"],
                  ["height", "cao"],
                ] as const
              ).map(([field, short]) => (
                <label
                  key={field}
                  className="flex items-center gap-1 text-xs text-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  {short}
                  <input
                    type="number"
                    value={z[field]}
                    onChange={(e) => updateZone(i, { [field]: Number(e.target.value) || 0 })}
                    className="input w-14 text-xs"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeZone(i);
                }}
                className="ml-auto text-xs text-red"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
