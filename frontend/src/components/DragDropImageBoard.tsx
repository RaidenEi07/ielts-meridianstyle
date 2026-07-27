"use client";

import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { PlayerDragItem, PlayerDragZone } from "@/lib/types";

function DraggableItemChip({ item }: { item: PlayerDragItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: { itemId: String(item.id) },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none select-none rounded-full border-2 border-primary bg-primary-soft px-4 py-2 text-sm font-semibold text-primary active:cursor-grabbing ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      {item.content}
    </div>
  );
}

function DropZone({
  zone,
  filledItem,
  onClear,
}: {
  zone: PlayerDragZone;
  filledItem: PlayerDragItem | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.label });
  return (
    <div
      ref={setNodeRef}
      onClick={filledItem ? onClear : undefined}
      className={`absolute flex items-center justify-center rounded border-2 border-dashed p-1 text-center text-xs font-semibold transition-colors ${
        filledItem
          ? "cursor-pointer border-solid border-primary bg-primary-soft text-primary"
          : isOver
            ? "border-primary bg-primary-soft/60 text-primary"
            : "border-accent bg-accent-soft/60 text-accent"
      }`}
      style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
    >
      {filledItem ? filledItem.content : zone.label}
    </div>
  );
}

export function DragDropImageBoard({
  backgroundImageUrl,
  dragItems,
  dragZones,
  answer,
  onChange,
}: {
  backgroundImageUrl: string | null;
  dragItems: PlayerDragItem[];
  dragZones: PlayerDragZone[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  onChange: (r: { placements: Record<string, string> }) => void;
}) {
  const placements: Record<string, string> = answer?.placements ?? {};

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const itemId = active.data.current?.itemId as string | undefined;
    if (!itemId) return;
    const targetLabel = String(over.id);
    const next = { ...placements };
    Object.keys(next).forEach((id) => {
      if (next[id] === targetLabel) delete next[id];
    });
    next[itemId] = targetLabel;
    onChange({ placements: next });
  }

  function clearZone(targetLabel: string) {
    const next = { ...placements };
    Object.keys(next).forEach((id) => {
      if (next[id] === targetLabel) delete next[id];
    });
    onChange({ placements: next });
  }

  const usedItemIds = new Set(Object.keys(placements));

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {backgroundImageUrl && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundImageUrl}
              alt=""
              className="max-w-full rounded-lg border border-border"
            />
            {dragZones.map((z) => {
              const itemId = Object.keys(placements).find((id) => placements[id] === z.label);
              const filledItem = itemId
                ? (dragItems.find((d) => String(d.id) === itemId) ?? null)
                : null;
              return (
                <DropZone
                  key={z.id}
                  zone={z}
                  filledItem={filledItem}
                  onClear={() => clearZone(z.label)}
                />
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4">
          {dragItems
            .filter((item) => !usedItemIds.has(String(item.id)))
            .map((item) => (
              <DraggableItemChip key={item.id} item={item} />
            ))}
        </div>
      </div>
    </DndContext>
  );
}
