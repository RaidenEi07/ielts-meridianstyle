"use client";

import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { PlayerDragItem } from "@/lib/types";

function DraggableWordChip({ item }: { item: PlayerDragItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `word-${item.id}`,
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

function BlankSlot({
  targetLabel,
  filledItem,
  onClear,
}: {
  targetLabel: string;
  filledItem: PlayerDragItem | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: targetLabel });
  return (
    <span
      ref={setNodeRef}
      onClick={filledItem ? onClear : undefined}
      className={`mx-1 inline-flex min-w-[64px] items-center justify-center rounded-full border-2 px-3 py-1.5 align-middle text-sm font-semibold transition-colors ${
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

export function KidsDragDropSentence({
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

  function clearBlank(targetLabel: string) {
    const next = { ...placements };
    Object.keys(next).forEach((id) => {
      if (next[id] === targetLabel) delete next[id];
    });
    onChange({ placements: next });
  }

  const usedItemIds = new Set(Object.keys(placements));

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        <p className="whitespace-pre-wrap text-lg leading-10">
          {parts.map((part, i) => {
            if (i % 2 === 0) return <span key={i}>{part}</span>;
            const targetLabel = part;
            const itemId = Object.keys(placements).find((id) => placements[id] === targetLabel);
            const filledItem = itemId
              ? (dragItems.find((d) => String(d.id) === itemId) ?? null)
              : null;
            return (
              <BlankSlot
                key={i}
                targetLabel={targetLabel}
                filledItem={filledItem}
                onClear={() => clearBlank(targetLabel)}
              />
            );
          })}
        </p>
        <div className="flex flex-wrap justify-center gap-3 rounded-xl border border-border bg-surface p-4">
          {dragItems
            .filter((item) => !usedItemIds.has(String(item.id)))
            .map((item) => (
              <DraggableWordChip key={item.id} item={item} />
            ))}
        </div>
      </div>
    </DndContext>
  );
}
