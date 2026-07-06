export interface QuestionTypeMeta {
  value: string;
  label: string;
  cls: string;
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm", cls: "bg-primary-soft text-primary" },
  { value: "TRUE_FALSE_NOT_GIVEN", label: "Đúng/Sai/NG", cls: "bg-info/15 text-info" },
  { value: "MATCHING", label: "Nối", cls: "bg-green-soft text-green" },
  { value: "SHORT_ANSWER", label: "Trả lời ngắn", cls: "bg-accent-soft text-accent" },
  { value: "ESSAY", label: "Tự luận", cls: "bg-red-soft text-red" },
  { value: "DRAG_DROP_TEXT", label: "Kéo thả văn bản", cls: "bg-primary-soft text-primary" },
  { value: "DRAG_DROP_MARKER", label: "Kéo thả ảnh", cls: "bg-accent-soft text-accent" },
  { value: "CLOZE", label: "Điền khuyết", cls: "bg-green-soft text-green" },
];

export const TYPE_META: Record<string, QuestionTypeMeta> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t]),
);
