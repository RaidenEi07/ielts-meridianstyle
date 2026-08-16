"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, questionBankApi } from "@/lib/api";
import type { PassageSummary, QuestionCategoryNode, QuestionDetail, QuestionTag } from "@/lib/types";
import { QuestionForm } from "./QuestionForm";

/** Sửa câu hỏi ngay tại chỗ (không rời trang danh sách) — tải riêng
 * passages/tags của chính modal này (categories dùng lại từ trang cha vì đã
 * có sẵn), tái sử dụng nguyên `QuestionForm` giống hệt trang `/[id]` cũ. */
export function EditModal({
  questionId,
  token,
  categories,
  onCategoriesChanged,
  onSaved,
  onClose,
}: {
  questionId: number;
  token: string;
  categories: QuestionCategoryNode[];
  onCategoriesChanged: () => void;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    questionBankApi.passages(token).then(setPassages).catch(() => {});
    questionBankApi.tags(token).then(setTags).catch(() => {});
    questionBankApi
      .question(token, questionId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được câu hỏi"));
  }, [token, questionId]);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-card border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Sửa câu hỏi</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-muted hover:text-text"
          >
            Đóng <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red">{error}</p>}
        {!detail ? (
          !error && <p className="text-muted">Đang tải…</p>
        ) : (
          <QuestionForm
            mode="edit"
            initial={detail}
            categories={categories}
            passages={passages}
            tags={tags}
            token={token}
            onSaved={onSaved}
            onCategoriesChanged={onCategoriesChanged}
          />
        )}
      </div>
    </div>
  );
}
