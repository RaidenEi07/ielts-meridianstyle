"use client";

import { Eye, FileText, X } from "lucide-react";
import { useState } from "react";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { TYPE_META } from "@/lib/questionTypes";
import { toPlayerQuestion } from "@/lib/toPlayerQuestion";
import type { PassageSummary, QuestionDetail, QuizPageAdmin, QuizQuestionAdmin } from "@/lib/types";

/**
 * Xem trước CẢ Part chứa 1 câu hỏi (đoạn văn/audio + toàn bộ câu hỏi trong
 * Part đó, đúng thứ tự) — thay vì chỉ 1 câu cô lập như PreviewModal gốc.
 * Chỉ dùng cho câu ĐÃ gắn vào quiz (mới có Part để hiện); câu đang chọn từ
 * ngân hàng (chưa gắn) vẫn dùng PreviewModal 1-câu như cũ.
 */
export function PartPreviewModal({
  page,
  passage,
  items,
  questions,
  onClose,
}: {
  page: QuizPageAdmin | undefined;
  passage: PassageSummary | undefined;
  items: QuizQuestionAdmin[];
  questions: QuestionDetail[];
  onClose: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<Record<number, any>>({});

  const partLabel = page
    ? `Part ${page.pageNumber}${page.partLabel ? ` — ${page.partLabel}` : ""}`
    : "Chưa gán trang";

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-card border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Xem trước — {partLabel}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Eye className="h-3.5 w-3.5" /> Góc nhìn học viên — không hiển thị đáp án đúng.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-1 text-sm text-muted hover:text-text"
          >
            Đóng <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-2">
          <div className="overflow-y-auto border-b border-border p-6 md:border-b-0 md:border-r">
            {!passage ? (
              <p className="text-sm text-muted">Part này chưa gán đoạn văn/audio.</p>
            ) : (
              <div>
                <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted">
                  <FileText className="h-3.5 w-3.5" /> {passage.title}
                </p>
                {passage.kind === "LISTENING" ? (
                  passage.audioUrl ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls src={passage.audioUrl} className="w-full" />
                  ) : (
                    <p className="text-xs text-red">Chưa có file audio.</p>
                  )
                ) : (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: passage.content ?? "" }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-5 overflow-y-auto p-6">
            {items.length === 0 && <p className="text-sm text-muted">Part này chưa có câu hỏi.</p>}
            {items.map((item, i) => {
              const q = questions[i];
              if (!q) return null;
              const meta = TYPE_META[q.type] ?? { label: q.type, cls: "bg-soft text-muted" };
              const playerQuestion = toPlayerQuestion(q);
              return (
                <div key={item.quizQuestionId}>
                  {item.groupIntro && (
                    <div
                      className="prose prose-sm dark:prose-invert mb-3 max-w-none border-b border-border pb-3 text-muted"
                      dangerouslySetInnerHTML={{ __html: item.groupIntro }}
                    />
                  )}
                  <div className="rounded-card border border-border bg-soft/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted">{item.mark} điểm</span>
                    </div>
                    {q.type === "ESSAY" ? (
                      <div>
                        <div
                          className="prose prose-sm dark:prose-invert mb-2 max-w-none font-medium"
                          dangerouslySetInnerHTML={{ __html: q.stem ?? "" }}
                        />
                        <textarea
                          placeholder="Học viên sẽ viết bài tại đây…"
                          rows={4}
                          className="input mt-2 w-full text-sm"
                          disabled
                        />
                        <p className="mt-1 text-xs text-muted">Luôn chấm tay, không tự động.</p>
                      </div>
                    ) : (
                      <>
                        {q.type !== "CLOZE" && q.type !== "DRAG_DROP_TEXT" && q.stem && (
                          <div
                            className="prose prose-sm dark:prose-invert mb-3 max-w-none text-sm font-medium"
                            dangerouslySetInnerHTML={{ __html: q.stem }}
                          />
                        )}
                        <QuestionRenderer
                          question={playerQuestion}
                          answer={answers[q.id]}
                          onChange={(r) => setAnswers((prev) => ({ ...prev, [q.id]: r }))}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
