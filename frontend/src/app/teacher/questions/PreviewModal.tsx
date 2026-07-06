"use client";

import { Eye, FileText, X } from "lucide-react";
import { useState } from "react";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { TYPE_META } from "@/lib/questionTypes";
import { toPlayerQuestion } from "@/lib/toPlayerQuestion";
import type { QuestionDetail } from "@/lib/types";

export function PreviewModal({ question, onClose }: { question: QuestionDetail; onClose: () => void }) {
  const meta = TYPE_META[question.type] ?? { label: question.type, cls: "bg-soft text-muted" };
  const settings = (question.settings ?? {}) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answer, setAnswer] = useState<any>(null);
  const playerQuestion = toPlayerQuestion(question);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                {meta.label}
              </span>
              <span className="text-xs text-muted">{question.defaultMark} điểm</span>
            </div>
            <h2 className="text-lg font-bold">{question.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex items-center gap-1 text-sm text-muted hover:text-text">
            Đóng <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-soft px-3 py-1.5 text-xs text-muted">
          <Eye className="h-3.5 w-3.5" /> Xem trước theo góc nhìn học viên — không hiển thị đáp án đúng.
        </p>

        {question.passageTitle && (
          <p className="mb-2 flex items-center gap-1 text-xs text-muted">
            <FileText className="h-3.5 w-3.5" /> Passage: {question.passageTitle}
          </p>
        )}
        {question.type !== "CLOZE" && question.type !== "DRAG_DROP_TEXT" && question.stem && (
          <div
            className="prose prose-sm dark:prose-invert mb-4 max-w-none text-sm font-medium"
            dangerouslySetInnerHTML={{ __html: question.stem }}
          />
        )}

        <div className="border-t border-border pt-3 text-sm">
          {question.type === "ESSAY" ? (
            <div>
              <div
                className="prose prose-sm dark:prose-invert mb-2 max-w-none font-medium"
                dangerouslySetInnerHTML={{ __html: question.stem ?? "" }}
              />
              {typeof settings.wordLimit === "number" && (
                <p className="text-xs text-muted">Giới hạn: {settings.wordLimit} từ</p>
              )}
              <textarea
                placeholder="Học viên sẽ viết bài tại đây…"
                rows={4}
                className="input mt-2 w-full text-sm"
                disabled
              />
              <p className="mt-1 text-xs text-muted">Luôn chấm tay, không tự động.</p>
            </div>
          ) : (
            <QuestionRenderer question={playerQuestion} answer={answer} onChange={setAnswer} />
          )}
        </div>

        {question.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
