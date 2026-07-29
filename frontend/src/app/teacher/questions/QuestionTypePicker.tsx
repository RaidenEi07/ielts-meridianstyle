"use client";

import {
  FileText,
  Grid3x3,
  Link as LinkIcon,
  ListChecks,
  Map,
  PenLine,
  Puzzle,
  Scale,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questionTypes";

const TYPE_ICONS: Record<string, LucideIcon> = {
  MULTIPLE_CHOICE: ListChecks,
  TRUE_FALSE_NOT_GIVEN: Scale,
  MATCHING: LinkIcon,
  SHORT_ANSWER: PenLine,
  ESSAY: FileText,
  DRAG_DROP_TEXT: Puzzle,
  DRAG_DROP_MARKER: Map,
  CLOZE: TextCursorInput,
  GRID_MATCHING: Grid3x3,
};

export function QuestionTypePicker({
  onSelect,
  allowedTypes,
}: {
  onSelect: (type: string) => void;
  allowedTypes?: string[];
}) {
  // Trả lời ngắn bị ẩn khi TẠO câu hỏi mới — Cloze 1 ô trống đã thay thế được
  // hoàn toàn, còn câu Trả lời ngắn đã có vẫn sửa/làm bài/chấm điểm bình thường.
  const types = (
    allowedTypes ? QUESTION_TYPES.filter((t) => allowedTypes.includes(t.value)) : QUESTION_TYPES
  ).filter((t) => t.value !== "SHORT_ANSWER");
  return (
    <div className="animate-fade-slide-in">
      <h2 className="mb-1 text-lg font-semibold">Chọn loại câu hỏi</h2>
      <p className="mb-4 text-sm text-muted">Bấm vào một loại để bắt đầu điền nội dung.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {types.map((t) => {
          const Icon = TYPE_ICONS[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onSelect(t.value)}
              className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <Icon className="h-8 w-8" />
              <span className="text-sm font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
