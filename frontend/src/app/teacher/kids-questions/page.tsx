"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, questionBankApi } from "@/lib/api";
import { TYPE_META } from "@/lib/questionTypes";
import type { QuestionCategoryNode, QuestionDetail, QuestionSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { PreviewModal } from "../questions/PreviewModal";

/**
 * Ngân hàng câu hỏi Trẻ em — route riêng biệt với /teacher/questions để không
 * ai thấy nhầm nội dung IELTS lẫn với Trẻ em. Luôn lọc audience=KIDS.
 */
export default function KidsQuestionBankPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [categories, setCategories] = useState<QuestionCategoryNode[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<QuestionDetail | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("question:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!allowed || !accessToken) return;
    questionBankApi.categories(accessToken, "KIDS").then(setCategories).catch(() => {});
  }, [allowed, accessToken]);

  function refresh() {
    if (!allowed || !accessToken) return;
    questionBankApi
      .questions(accessToken, activeCat ?? undefined, "KIDS")
      .then(setQuestions)
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, accessToken, activeCat]);

  async function openPreview(id: number) {
    if (!accessToken) return;
    setError(null);
    try {
      const detail = await questionBankApi.question(accessToken, id);
      setPreviewing(detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được câu hỏi");
    }
  }

  async function removeQuestion(id: number, name: string) {
    if (!accessToken) return;
    if (!(await confirm(`Xóa câu hỏi "${name}"? Hành động này không thể hoàn tác.`))) return;
    setError(null);
    try {
      await questionBankApi.deleteQuestion(accessToken, id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa câu hỏi thất bại");
    }
  }

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>question:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="Ngân hàng câu hỏi — Trẻ em"
        backHref="/teacher/question-bank"
        backLabel="Ngân hàng câu hỏi"
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[240px_1fr]">
        {/* Cây danh mục (chỉ danh mục KIDS) */}
        <aside className="md:sticky md:top-8 md:self-start">
          <div className="rounded-card border border-border bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-muted">Danh mục</h2>
            <ul className="space-y-1">
              <CatItem
                active={activeCat === null}
                label="Tất cả"
                onClick={() => setActiveCat(null)}
              />
              {categories.map((c) => (
                <CatItem
                  key={c.id}
                  active={activeCat === c.id}
                  label={c.name}
                  indent={c.parentId !== null}
                  onClick={() => setActiveCat(c.id)}
                />
              ))}
            </ul>
          </div>
        </aside>

        {/* Bảng câu hỏi */}
        <main>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Câu hỏi ({questions.length})</h1>
            <Link
              href="/teacher/kids-questions/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              + Tạo câu hỏi mới
            </Link>
          </div>
          {error && <p className="mb-3 text-sm text-red">{error}</p>}
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tên</th>
                  <th className="px-4 py-2.5 font-medium">Loại</th>
                  <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
                  <th className="px-4 py-2.5 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Chưa có câu hỏi nào.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const meta = TYPE_META[q.type] ?? {
                      label: q.type,
                      cls: "bg-soft text-muted",
                    };
                    return (
                      <tr key={q.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{q.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted">
                          {q.defaultMark}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => openPreview(q.id)}
                              className="font-semibold text-accent"
                            >
                              Xem trước
                            </button>
                            <Link
                              href={`/teacher/kids-questions/${q.id}`}
                              className="font-semibold text-primary"
                            >
                              Sửa
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.id, q.name)}
                              className="font-semibold text-red"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {previewing && (
        <PreviewModal question={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}

function CatItem({
  active,
  label,
  indent,
  onClick,
}: {
  active: boolean;
  label: string;
  indent?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          indent ? "pl-6" : ""
        } ${active ? "bg-primary-soft font-semibold text-primary" : "text-text hover:bg-soft"}`}
      >
        {label}
      </button>
    </li>
  );
}
