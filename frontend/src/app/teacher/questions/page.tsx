"use client";

import { Download, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, questionBankApi } from "@/lib/api";
import { TYPE_META } from "@/lib/questionTypes";
import type {
  ImportSummary,
  QuestionCategoryNode,
  QuestionDetail,
  QuestionSummary,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { PreviewModal } from "./PreviewModal";

export default function QuestionBankPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe, hasCapability } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [categories, setCategories] = useState<QuestionCategoryNode[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<QuestionDetail | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
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
    questionBankApi.categories(accessToken, "IELTS").then(setCategories).catch(() => {});
  }, [allowed, accessToken]);

  useEffect(() => {
    if (!allowed || !accessToken) return;
    questionBankApi
      .questions(accessToken, activeCat ?? undefined, "IELTS")
      .then(setQuestions)
      .catch(() => {});
  }, [allowed, accessToken, activeCat]);

  function refresh() {
    if (!accessToken) return;
    questionBankApi
      .questions(accessToken, activeCat ?? undefined, "IELTS")
      .then(setQuestions)
      .catch(() => {});
  }

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

  async function duplicateQuestion(id: number) {
    if (!accessToken) return;
    setError(null);
    try {
      await questionBankApi.duplicateQuestion(accessToken, id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nhân bản câu hỏi thất bại");
    }
  }

  async function exportCategory(id: number, name: string) {
    if (!accessToken) return;
    setError(null);
    try {
      const blob = await questionBankApi.exportCategory(accessToken, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `question-bank-${name.trim().replace(/\s+/g, "-").toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xuất câu hỏi thất bại");
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const result = await questionBankApi.importBundle(accessToken, file);
      setImportResult(result);
      refresh();
      questionBankApi.categories(accessToken, "IELTS").then(setCategories).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nhập câu hỏi thất bại");
    } finally {
      setImporting(false);
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
        title="Ngân hàng câu hỏi — Academic"
        backHref="/teacher/question-bank"
        backLabel="Ngân hàng câu hỏi"
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[240px_1fr]">
        {/* Cây danh mục */}
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
                  onExport={() => exportCategory(c.id, c.name)}
                />
              ))}
            </ul>
          </div>
        </aside>

        {/* Bảng câu hỏi */}
        <main>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Câu hỏi ({questions.length})</h1>
            <div className="flex items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {importing ? "Đang nhập…" : "Nhập"}
              </button>
              <Link
                href="/teacher/questions/new"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                + Tạo câu hỏi mới
              </Link>
            </div>
          </div>
          {error && <p className="mb-3 text-sm text-red">{error}</p>}
          {importResult && (
            <div className="mb-4 rounded-card border border-border bg-surface p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Kết quả nhập</h3>
                <button
                  type="button"
                  onClick={() => setImportResult(null)}
                  className="text-faint hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-1 text-muted">
                <li>
                  Danh mục: {importResult.categoriesCreated} tạo mới,{" "}
                  {importResult.categoriesReused} tái sử dụng
                </li>
                <li>
                  Passage: {importResult.passagesCreated} tạo mới,{" "}
                  {importResult.passagesReused} tái sử dụng
                </li>
                <li>
                  Tag: {importResult.tagsCreated} tạo mới, {importResult.tagsReused} tái sử dụng
                </li>
                <li>
                  Câu hỏi: {importResult.questionsCreated} tạo mới,{" "}
                  {importResult.questionsSkippedDuplicate} bỏ qua (trùng tên)
                </li>
              </ul>
              {importResult.warnings.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="mb-1 font-medium text-red">Cảnh báo:</p>
                  <ul className="list-inside list-disc space-y-0.5 text-red">
                    {importResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tên</th>
                  <th className="px-4 py-2.5 font-medium">Loại</th>
                  <th className="px-4 py-2.5 font-medium">Tag</th>
                  <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
                  <th className="px-4 py-2.5 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">
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
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {q.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
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
                              href={`/teacher/questions/${q.id}`}
                              className="font-semibold text-primary"
                            >
                              Sửa
                            </Link>
                            <button
                              type="button"
                              onClick={() => duplicateQuestion(q.id)}
                              className="font-semibold text-muted"
                            >
                              Nhân bản
                            </button>
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
  onExport,
}: {
  active: boolean;
  label: string;
  indent?: boolean;
  onClick: () => void;
  onExport?: () => void;
}) {
  return (
    <li className="group flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          indent ? "pl-6" : ""
        } ${active ? "bg-primary-soft font-semibold text-primary" : "text-text hover:bg-soft"}`}
      >
        {label}
      </button>
      {onExport && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          title="Xuất câu hỏi của danh mục này ra file .zip"
          className="shrink-0 rounded-lg p-1.5 text-faint opacity-0 transition-opacity hover:bg-soft hover:text-primary group-hover:opacity-100"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
