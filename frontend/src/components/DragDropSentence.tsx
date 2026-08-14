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
  number,
  onClear,
}: {
  targetLabel: string;
  filledItem: PlayerDragItem | null;
  /** Số thứ tự câu hỏi thật (vd 21) — hiện thành 1 huy hiệu tròn ngay trước ô
   * thả, khớp cách CLOZE đánh số từng chỗ trống (xem QuestionRenderer.tsx). */
  number?: number;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: targetLabel });
  return (
    <span className="mx-1 inline-flex items-center align-middle">
      {number != null && (
        <span className="mr-1 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
          {number}
        </span>
      )}
      <span
        ref={setNodeRef}
        onClick={filledItem ? onClear : undefined}
        className={`inline-flex min-w-[64px] items-center justify-center rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
          filledItem
            ? "cursor-pointer border-solid border-primary bg-primary-soft text-primary"
            : isOver
              ? "border-dashed border-primary bg-primary-soft text-faint"
              : "border-dashed border-border bg-soft text-faint"
        }`}
      >
        {filledItem ? filledItem.content : "….."}
      </span>
    </span>
  );
}

/** Kéo-thả từ/cụm từ vào chỗ trống trong câu (Sentence/Summary Completion
 * kiểu word-bank) — dùng cho mọi audience, khớp IELTS CD thật.
 *
 * templateHeading/bankHeading: tiêu đề phụ TÙY CHỌN phía trên từng khối —
 * dùng cho dạng "Matching Features" mượn cơ chế này để hiện 1 danh sách mục
 * kèm chỗ trống (vd "Businesses") + 1 khối đáp án dùng chung (vd "Comments").
 * Câu Sentence/Summary Completion thường (1 câu văn liền mạch) không cần đặt
 * — để trống thì không hiện gì, không đổi layout hiện có. */
export function DragDropSentence({
  template,
  templateHeading,
  bankHeading,
  dragItems,
  answer,
  onChange,
  quizQuestionId,
  blankOrder,
}: {
  template: string;
  templateHeading?: string | null;
  bankHeading?: string | null;
  dragItems: PlayerDragItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  onChange: (r: { placements: Record<string, string> }) => void;
  /** Cần cả 2 để tra đúng số thứ tự đề thi thật cho từng ô — khớp key
   * "<quizQuestionId>:dd<label>" mà expandSlots() dùng để đánh số toàn quiz
   * (xem quiz/[attemptId]/page.tsx). Không truyền = không hiện số (vd màn
   * xem trước ở admin không có khái niệm thứ tự toàn quiz). */
  quizQuestionId?: number;
  blankOrder?: Map<string, number>;
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
        <div>
          {templateHeading && (
            <p className="mb-2 text-base font-semibold text-text">{templateHeading}</p>
          )}
          <p className="whitespace-pre-wrap text-lg leading-10 text-text">
            {parts.map((part, i) => {
              if (i % 2 === 0) return <span key={i}>{part}</span>;
              const targetLabel = part;
              const itemId = Object.keys(placements).find((id) => placements[id] === targetLabel);
              const filledItem = itemId
                ? (dragItems.find((d) => String(d.id) === itemId) ?? null)
                : null;
              const number =
                quizQuestionId != null
                  ? blankOrder?.get(`${quizQuestionId}:dd${targetLabel}`)
                  : undefined;
              return (
                <BlankSlot
                  key={i}
                  targetLabel={targetLabel}
                  filledItem={filledItem}
                  number={number}
                  onClear={() => clearBlank(targetLabel)}
                />
              );
            })}
          </p>
        </div>
        <div>
          {bankHeading && <p className="mb-2 text-base font-semibold text-text">{bankHeading}</p>}
          <div className="flex flex-wrap justify-center gap-3 rounded-xl border border-border bg-surface p-4">
            {dragItems
              .filter((item) => !usedItemIds.has(String(item.id)))
              .map((item) => (
                <DraggableWordChip key={item.id} item={item} />
              ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
