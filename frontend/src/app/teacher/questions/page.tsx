"use client";

import { Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CategoryTree } from "@/components/CategoryTree";
import { PageHeader } from "@/components/PageHeader";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ApiError, questionBankApi } from "@/lib/api";
import { categoryOptionLabel } from "@/lib/categoryLabel";
import { TYPE_META } from "@/lib/questionTypes";
import type {
  ImportSummary,
  QuestionCategoryNode,
  QuestionDetail,
  QuestionSummary,
  TextImportSummary,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useToast } from "@/store/toast";
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
  const [textImportOpen, setTextImportOpen] = useState(false);
  const [textImportCategoryId, setTextImportCategoryId] = useState<number | "">("");
  const [textImportText, setTextImportText] = useState("");
  const [textImporting, setTextImporting] = useState(false);
  const [textImportResult, setTextImportResult] = useState<TextImportSummary | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

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
    setSelected(new Set());
  }, [allowed, accessToken, activeCat]);

  function refresh() {
    if (!accessToken) return;
    questionBankApi
      .questions(accessToken, activeCat ?? undefined, "IELTS")
      .then(setQuestions)
      .catch(() => {});
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.id)),
    );
  }

  async function bulkDelete() {
    if (!accessToken || selected.size === 0) return;
    if (!(await confirm(`Xóa ${selected.size} câu hỏi đã chọn? Hành động này không thể hoàn tác.`))) {
      return;
    }
    setError(null);
    setBulkWorking(true);
    try {
      const count = selected.size;
      await questionBankApi.bulkDeleteQuestions(accessToken, [...selected]);
      setSelected(new Set());
      refresh();
      toast.success(`Đã xóa ${count} câu hỏi`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Xóa hàng loạt thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkWorking(false);
    }
  }

  async function bulkDuplicate() {
    if (!accessToken || selected.size === 0) return;
    setError(null);
    setBulkWorking(true);
    try {
      const count = selected.size;
      await questionBankApi.bulkDuplicateQuestions(accessToken, [...selected]);
      setSelected(new Set());
      refresh();
      toast.success(`Đã nhân đôi ${count} câu hỏi`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Nhân đôi hàng loạt thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkWorking(false);
    }
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
      toast.success("Đã xóa câu hỏi");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Xóa câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function duplicateQuestion(id: number) {
    if (!accessToken) return;
    setError(null);
    try {
      await questionBankApi.duplicateQuestion(accessToken, id);
      refresh();
      toast.success("Đã nhân bản câu hỏi");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Nhân bản câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
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
      toast.success("Đã xuất file .zip");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Xuất câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
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
      toast.success(`Đã nhập ${result.questionsCreated} câu hỏi từ file .zip`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Nhập câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }

  async function handleImportText() {
    if (!accessToken || !textImportCategoryId || !textImportText.trim()) return;
    setError(null);
    setTextImportResult(null);
    setTextImporting(true);
    try {
      const result = await questionBankApi.importMcqText(accessToken, {
        categoryId: textImportCategoryId,
        audience: "IELTS",
        text: textImportText,
      });
      setTextImportResult(result);
      if (result.questionsCreated > 0) {
        setTextImportText("");
        refresh();
      }
      if (result.errors.length > 0) {
        toast.error(`Đã tạo ${result.questionsCreated} câu hỏi, ${result.errors.length} block lỗi`);
      } else {
        toast.success(`Đã tạo ${result.questionsCreated} câu hỏi`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Nhập nhanh MCQ thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setTextImporting(false);
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
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeCat === null
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-text hover:bg-soft"
              }`}
            >
              Tất cả
            </button>
            <CategoryTree
              categories={categories}
              activeCat={activeCat}
              onSelect={setActiveCat}
              onExport={exportCategory}
            />
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
              <button
                type="button"
                onClick={() => setTextImportOpen((v) => !v)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text"
              >
                + Nhập nhanh MCQ
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
          {textImportOpen && (
            <div className="mb-4 rounded-card border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Nhập nhanh MCQ từ văn bản thô</h3>
                <button
                  type="button"
                  onClick={() => setTextImportOpen(false)}
                  className="text-faint hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-3 text-xs text-muted">
                Mỗi câu hỏi cách nhau bởi 1 dòng trống: đề bài, các dòng đáp án dạng{" "}
                <code>A. nội dung</code>, rồi 1 dòng <code>ANSWER: &lt;chữ cái&gt;</code>.
              </p>
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-muted">Danh mục đích</span>
                <SearchableSelect
                  value={textImportCategoryId}
                  onChange={setTextImportCategoryId}
                  placeholder="Tìm danh mục…"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: categoryOptionLabel(c, categories),
                  }))}
                />
              </label>
              <textarea
                value={textImportText}
                onChange={(e) => setTextImportText(e.target.value)}
                rows={10}
                placeholder={
                  "What is the capital of France?\nA. Paris\nB. London\nC. Rome\nANSWER: A"
                }
                className="input mb-3 w-full font-mono text-sm"
              />
              <button
                type="button"
                disabled={textImporting || !textImportCategoryId || !textImportText.trim()}
                onClick={handleImportText}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {textImporting ? "Đang nhập…" : "Nhập"}
              </button>
              {textImportResult && (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <p className="font-medium text-text">
                    Đã tạo {textImportResult.questionsCreated} câu hỏi
                    {textImportResult.errors.length > 0 &&
                      `, ${textImportResult.errors.length} block lỗi`}
                    .
                  </p>
                  {textImportResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1.5 text-red">
                      {textImportResult.errors.map((e, i) => (
                        <li key={i}>
                          <span className="font-semibold">Block {e.blockIndex}</span>{" "}
                          (&quot;{e.excerpt}&quot;): {e.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm">
              <span className="font-medium text-primary">{selected.size} câu hỏi đã chọn</span>
              <button
                type="button"
                onClick={bulkDuplicate}
                disabled={bulkWorking}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-60"
              >
                Nhân đôi ({selected.size})
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                disabled={bulkWorking}
                className="rounded-lg bg-red px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Xóa ({selected.size})
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={questions.length > 0 && selected.size === questions.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
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
                    <td colSpan={6} className="px-4 py-6 text-center text-muted">
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
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(q.id)}
                            onChange={() => toggleSelected(q.id)}
                          />
                        </td>
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

