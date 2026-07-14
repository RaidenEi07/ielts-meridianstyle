"use client";

import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { PlayerMatchingOption, PlayerMatchingPair } from "@/lib/types";

function Tile({ children, imageUrl }: { children: React.ReactNode; imageUrl?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
      )}
      <span className="text-sm font-semibold">{children}</span>
    </div>
  );
}

function DraggablePoolTile({ id, option }: { id: string; option: PlayerMatchingOption }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { value: option.value },
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
      className={`cursor-grab touch-none select-none rounded-xl border-2 border-border bg-surface p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      <Tile imageUrl={option.imageUrl}>{option.value}</Tile>
    </div>
  );
}

function DroppableTarget({
  pair,
  matchedValue,
  matchedImageUrl,
  onClear,
}: {
  pair: PlayerMatchingPair;
  matchedValue?: string;
  matchedImageUrl?: string | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(pair.id) });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary-soft" : "border-border bg-soft"
      }`}
    >
      <Tile imageUrl={pair.leftImageUrl}>{pair.leftItem}</Tile>
      <span className="text-lg text-muted">↓</span>
      {matchedValue ? (
        <button
          type="button"
          onClick={onClear}
          title="Bấm để bỏ chọn"
          className="rounded-lg border border-primary bg-surface p-2"
        >
          <Tile imageUrl={matchedImageUrl}>{matchedValue}</Tile>
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-2 text-xs text-faint">
          Thả vào đây
        </div>
      )}
    </div>
  );
}

export function KidsMatchingGame({
  pairs,
  pool,
  answer,
  onChange,
}: {
  pairs: PlayerMatchingPair[];
  pool: PlayerMatchingOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  onChange: (r: { matches: Record<string, string> }) => void;
}) {
  const matches: Record<string, string> = answer?.matches ?? {};

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const value = active.data.current?.value as string | undefined;
    if (!value) return;
    onChange({ matches: { ...matches, [String(over.id)]: value } });
  }

  function clearMatch(pairId: number) {
    const next = { ...matches };
    delete next[String(pairId)];
    onChange({ matches: next });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {pairs.map((p) => (
            <DroppableTarget
              key={p.id}
              pair={p}
              matchedValue={matches[String(p.id)]}
              matchedImageUrl={pool.find((o) => o.value === matches[String(p.id)])?.imageUrl}
              onClear={() => clearMatch(p.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 rounded-xl border border-border bg-surface p-4">
          {pool.map((o, i) => (
            <DraggablePoolTile key={`pool-${i}`} id={`pool-${i}`} option={o} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
