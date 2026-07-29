"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { PlayerDragItem } from "@/lib/types";

/** Ô thả nhúng ngay trong đoạn văn (Kéo-thả vào đoạn văn / Matching Heading). */
export function PassageDropBlank({
  targetLabel,
  filledItem,
  onClear,
}: {
  targetLabel: string;
  filledItem: PlayerDragItem | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `passage-blank-${targetLabel}` });
  return (
    <span
      ref={setNodeRef}
      onClick={filledItem ? onClear : undefined}
      className={`mx-1 inline-flex min-w-[64px] items-center justify-center rounded-full border-2 px-3 py-1 align-middle text-sm font-semibold transition-colors ${
        filledItem
          ? "cursor-pointer border-solid border-primary bg-primary-soft text-primary"
          : isOver
            ? "border-dashed border-primary bg-primary-soft text-faint"
            : "border-dashed border-border bg-soft text-faint"
      }`}
    >
      {filledItem ? filledItem.content : "….."}
    </span>
  );
}

/** Chip trong pool bên phải — kéo sang thả vào ô trống bên đoạn văn. */
export function PassageDragChip({ item }: { item: PlayerDragItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `passage-item-${item.id}`,
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
