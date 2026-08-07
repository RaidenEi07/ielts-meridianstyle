"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FileText, PenLine, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SearchableSelect } from "@/components/SearchableSelect";
import { SortableRow } from "@/components/SortableRow";
import { ApiError, quizAdminApi, questionBankApi } from "@/lib/api";
import { categoryOptionLabel } from "@/lib/categoryLabel";
import type {
  PassageSummary,
  QuestionCategoryNode,
  QuestionDetail,
  QuestionSummary,
  QuestionTag,
  QuizDetailAdmin,
  QuizPageAdmin,
  QuizQuestionAdmin,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useEditModeStore } from "@/store/editMode";
import { useToast } from "@/store/toast";
import { QuestionForm } from "@/app/teacher/questions/QuestionForm";
import { PassageForm } from "./PassageForm";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Bản nháp", cls: "bg-soft text-muted" },
  PUBLISHED: { label: "Đã xuất bản", cls: "bg-green-soft text-green" },
  ARCHIVED: { label: "Lưu trữ", cls: "bg-red-soft text-red" },
};

interface QuestionGroup {
  pageId: number | null;
  page: QuizPageAdmin | undefined;
  items: QuizQuestionAdmin[];
}

// Buckets by pageId (not by position), so each Part is exactly one group no
// matter how sortOrder currently interleaves them; groups are ordered by
// Part number ascending, with unassigned questions last.
function groupQuestionsByPage(
  questions: QuizQuestionAdmin[],
  pagesById: Map<number, QuizPageAdmin>,
): QuestionGroup[] {
  const buckets = new Map<number | null, QuizQuestionAdmin[]>();
  for (const q of questions) {
    if (!buckets.has(q.pageId)) buckets.set(q.pageId, []);
    buckets.get(q.pageId)!.push(q);
  }
  const groups: QuestionGroup[] = [...buckets.entries()].map(([pageId, items]) => ({
    pageId,
    page: pageId !== null ? pagesById.get(pageId) : undefined,
    items,
  }));
  groups.sort((a, b) => (a.page?.pageNumber ?? Infinity) - (b.page?.pageNumber ?? Infinity));
  return groups;
}

export default function AdminQuizDetailPage() {
  const params = useParams<{ id: string }>();
  const quizId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [detail, setDetail] = useState<QuizDetailAdmin | null>(null);
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() =>
        setAllowed(useAuthStore.getState().systemCapabilities.includes("course:manage")),
      )
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  const refresh = () =>
    quizAdminApi
      .detail(token, quizId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được quiz"));

  const refreshPassages = () => questionBankApi.passages(token).then(setPassages).catch(() => {});

  useEffect(() => {
    if (!allowed) return;
    refresh();
    refreshPassages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, quizId]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>course:manage</code>.
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
        title="Chi tiết Quiz"
        backHref={detail ? `/admin/courses/${detail.quiz.courseId}` : undefined}
        backLabel="Khóa học"
        maxWidthClass="max-w-4xl"
        showEditModeToggle
      />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}
        {!detail ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <>
            <QuizSettingsForm detail={detail} token={token} onSaved={refresh} />
            <PagesPanel
              detail={detail}
              passages={passages}
              token={token}
              onChanged={refresh}
              onPassagesChanged={refreshPassages}
            />
            <QuestionsPanel detail={detail} token={token} onChanged={refresh} />
          </>
        )}
      </main>
    </div>
  );
}

function QuizSettingsForm({
  detail,
  token,
  onSaved,
}: {
  detail: QuizDetailAdmin;
  token: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const q = detail.quiz;
  const isAcademic = q.audienceGroup === "IELTS";
  const [title, setTitle] = useState(q.title);
  const [intro, setIntro] = useState(q.intro ?? "");
  const [minutes, setMinutes] = useState(
    q.timeLimitSeconds ? String(Math.round(q.timeLimitSeconds / 60)) : "",
  );
  const [maxAttempts, setMaxAttempts] = useState(String(q.maxAttempts));
  const [shuffle, setShuffle] = useState(q.shuffleQuestions);
  const [antiCheat, setAntiCheat] = useState(q.antiCheatEnabled);
  const [maxViolations, setMaxViolations] = useState(String(q.maxViolations));
  const [passMark, setPassMark] = useState(q.passMark != null ? String(q.passMark) : "");
  const [status, setStatus] = useState(q.status);
  const [allowReview, setAllowReview] = useState(q.allowReviewAfterSubmit);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setTitle(q.title);
    setIntro(q.intro ?? "");
    setMinutes(q.timeLimitSeconds ? String(Math.round(q.timeLimitSeconds / 60)) : "");
    setMaxAttempts(String(q.maxAttempts));
    setShuffle(q.shuffleQuestions);
    setAntiCheat(q.antiCheatEnabled);
    setMaxViolations(String(q.maxViolations));
    setPassMark(q.passMark != null ? String(q.passMark) : "");
    setStatus(q.status);
    setAllowReview(q.allowReviewAfterSubmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await quizAdminApi.update(token, q.id, {
        title,
        intro,
        timeLimitSeconds: minutes ? Number(minutes) * 60 : undefined,
        maxAttempts: Number(maxAttempts),
        shuffleQuestions: shuffle,
        antiCheatEnabled: antiCheat,
        maxViolations: Number(maxViolations),
        passMark: passMark ? Number(passMark) : undefined,
        status,
        allowReviewAfterSubmit: allowReview,
      });
      setMsg("Đã lưu");
      setTimeout(() => setMsg(null), 2000);
      onSaved();
      toast.success("Đã lưu thay đổi quiz");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lưu thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await confirm(`Xóa quiz "${q.title}"? Hành động này không thể hoàn tác.`))) return;
    try {
      await quizAdminApi.remove(token, q.id);
      toast.success("Đã xóa quiz");
      router.push(`/admin/courses/${q.courseId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa quiz thất bại");
    }
  }

  const st = STATUS_META[q.status] ?? STATUS_META.DRAFT;

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{q.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
            {st.label}
          </span>
          {q.examTemplateCode && (
            <span className="rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-white">
              {q.examTemplateCode}
            </span>
          )}
        </div>
        <button type="button" onClick={remove} className="text-sm text-red">
          Xóa quiz
        </button>
      </div>

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Tiêu đề</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Giới thiệu</span>
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={2}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Thời gian (phút, để trống = không giới hạn)
          </span>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Số lượt làm tối đa (0 = không giới hạn)
          </span>
          <input
            type="number"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value)}
            className="input"
          />
        </label>
        {isAcademic && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Điểm đạt</span>
            <input
              type="number"
              value={passMark}
              onChange={(e) => setPassMark(e.target.value)}
              className="input"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Trạng thái</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
          />
          Trộn thứ tự câu hỏi
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowReview}
            onChange={(e) => setAllowReview(e.target.checked)}
          />
          Cho phép học viên xem lại bài làm, kết quả và đáp án sau khi nộp
        </label>
        {isAcademic && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={antiCheat}
              onChange={(e) => setAntiCheat(e.target.checked)}
            />
            Bật chống gian lận
          </label>
        )}
        {isAcademic && antiCheat && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Số vi phạm tối đa trước khi tự nộp
            </span>
            <input
              type="number"
              value={maxViolations}
              onChange={(e) => setMaxViolations(e.target.value)}
              className="input"
            />
          </label>
        )}
        {error && <p className="text-sm text-red sm:col-span-2">{error}</p>}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
          {msg && <span className="text-sm text-green">{msg}</span>}
        </div>
      </form>
    </section>
  );
}

function PagesPanel({
  detail,
  passages,
  token,
  onChanged,
  onPassagesChanged,
}: {
  detail: QuizDetailAdmin;
  passages: PassageSummary[];
  token: string;
  onChanged: () => void;
  onPassagesChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [partLabel, setPartLabel] = useState("");
  const [passageId, setPassageId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [creatingPassage, setCreatingPassage] = useState(false);
  const [editingPassage, setEditingPassage] = useState<PassageSummary | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  if (detail.quiz.audienceGroup !== "IELTS") {
    return null;
  }

  const usedNumbers = new Set(detail.pages.map((p) => p.pageNumber));
  const nextNumber = [1, 2, 3].find((n) => !usedNumbers.has(n));

  async function addPage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await quizAdminApi.setPage(token, detail.quiz.id, {
        pageNumber,
        partLabel: partLabel || undefined,
        passageId: passageId ? Number(passageId) : undefined,
      });
      setPartLabel("");
      setPassageId("");
      setAdding(false);
      onChanged();
      toast.success("Đã lưu Part");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lưu trang thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  function startEditPage(p: QuizPageAdmin) {
    setPageNumber(p.pageNumber);
    setPartLabel(p.partLabel ?? "");
    setPassageId(p.passageId ?? "");
    setError(null);
    setAdding(true);
  }

  async function removePage(pageId: number) {
    if (
      !(await confirm(
        "Xóa Part này? Câu hỏi đã gán vào Part này sẽ chuyển về trạng thái chưa gán trang.",
      ))
    )
      return;
    setError(null);
    try {
      await quizAdminApi.deletePage(token, pageId);
      onChanged();
      toast.success("Đã xóa Part");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Xóa Part thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Phân trang (Part 1-3)</h2>
        {nextNumber && !adding && (
          <button
            type="button"
            onClick={() => {
              setPageNumber(nextNumber);
              setAdding(true);
            }}
            className="text-sm font-semibold text-accent"
          >
            + Thêm trang
          </button>
        )}
      </div>

      {detail.pages.length === 0 && !adding && (
        <p className="text-sm text-muted">
          Chưa có trang nào — dùng cho Reading (gắn passage văn bản) hoặc
          Listening (gắn passage audio).
        </p>
      )}

      <ul className="mb-3 space-y-2">
        {detail.pages.map((p) => {
          const passage = passages.find((ps) => ps.id === p.passageId);
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-soft px-3 py-2 text-sm"
            >
              <span className="font-semibold">Part {p.pageNumber}</span>
              <span className="flex-1">{p.partLabel ?? "—"}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                {passage ? (
                  <>
                    <FileText className="h-3.5 w-3.5" /> {passage.title} ({passage.kind})
                  </>
                ) : (
                  "Chưa gắn passage"
                )}
              </span>
              {passage && (
                <button
                  type="button"
                  onClick={() => setEditingPassage(passage)}
                  className="flex items-center gap-1 text-xs font-semibold text-accent"
                >
                  <PenLine className="h-3.5 w-3.5" /> Sửa passage
                </button>
              )}
              <button
                type="button"
                onClick={() => startEditPage(p)}
                className="flex items-center gap-1 text-xs font-semibold text-accent"
              >
                <PenLine className="h-3.5 w-3.5" /> Sửa
              </button>
              <button
                type="button"
                onClick={() => removePage(p.id)}
                className="flex items-center gap-1 text-xs font-semibold text-red"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa
              </button>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form onSubmit={addPage} className="space-y-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <input
              value={partLabel}
              onChange={(e) => setPartLabel(e.target.value)}
              placeholder={`Part ${pageNumber} — Reading Passage`}
              className="input flex-1 text-sm"
            />
            <div className="w-64">
              <SearchableSelect
                value={passageId}
                onChange={setPassageId}
                allowClear
                clearLabel="— Không gắn passage —"
                placeholder="Tìm passage…"
                options={passages.map((p) => ({ value: p.id, label: `${p.title} (${p.kind})` }))}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Lưu Part {pageNumber}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
            >
              Hủy
            </button>
            {!creatingPassage && (
              <button
                type="button"
                onClick={() => setCreatingPassage(true)}
                className="ml-auto text-sm font-semibold text-accent"
              >
                + Tạo Passage mới
              </button>
            )}
          </div>
        </form>
      )}

      {creatingPassage && (
        <div className="mt-3">
          <PassageForm
            token={token}
            onCancel={() => setCreatingPassage(false)}
            onSaved={(p) => {
              setCreatingPassage(false);
              setPassageId(p.id);
              onPassagesChanged();
            }}
          />
        </div>
      )}

      {editingPassage && (
        <div className="mt-3">
          <PassageForm
            token={token}
            initial={editingPassage}
            onCancel={() => setEditingPassage(null)}
            onSaved={() => {
              setEditingPassage(null);
              onPassagesChanged();
            }}
          />
        </div>
      )}
    </section>
  );
}

function QuestionsPanel({
  detail,
  token,
  onChanged,
}: {
  detail: QuizDetailAdmin;
  token: string;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [pickerTab, setPickerTab] = useState<"bank" | "create">("bank");
  const [bank, setBank] = useState<QuestionSummary[] | null>(null);
  const [categories, setCategories] = useState<QuestionCategoryNode[]>([]);
  const [createCategories, setCreateCategories] = useState<QuestionCategoryNode[]>([]);
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mark, setMark] = useState("1");
  const [pageId, setPageId] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDetail, setEditingDetail] = useState<QuestionDetail | null>(null);
  const [editingGroupIntroFor, setEditingGroupIntroFor] = useState<number | null>(null);
  const [groupIntroDraft, setGroupIntroDraft] = useState("");
  const [savingGroupIntro, setSavingGroupIntro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editMode = useEditModeStore((s) => s.enabled);
  const sensors = useSensors(useSensor(PointerSensor));
  const confirm = useConfirm();
  const toast = useToast();
  const isAcademic = detail.quiz.audienceGroup === "IELTS";

  const attachedIds = new Set(detail.questions.map((q) => q.questionId));
  const pagesById = new Map(detail.pages.map((p) => [p.id, p]));

  // Gợi ý sẵn danh mục/passage khi soạn câu hỏi MỚI ngay trong quiz này — lấy
  // danh mục xuất hiện nhiều nhất trong số câu đã gắn (đa số quiz academic chỉ
  // dùng đúng 1 danh mục cho toàn bộ câu hỏi của nó), và passage của Part đang
  // chọn ở ô "Gán vào trang" — đỡ phải tự chọn lại đúng thứ đã hiển nhiên.
  const categoryCounts = new Map<number, number>();
  detail.questions.forEach((q) => {
    const catId = bank?.find((b) => b.id === q.questionId)?.categoryId;
    if (catId != null) categoryCounts.set(catId, (categoryCounts.get(catId) ?? 0) + 1);
  });
  let defaultCategoryId: number | undefined;
  let maxCategoryCount = 0;
  categoryCounts.forEach((count, id) => {
    if (count > maxCategoryCount) {
      maxCategoryCount = count;
      defaultCategoryId = id;
    }
  });
  const defaultPassageId = pageId ? (pagesById.get(Number(pageId))?.passageId ?? undefined) : undefined;

  // Bucket questions by Part so each Part renders as exactly one contiguous
  // block (instead of scattering wherever its questions happen to fall in
  // sortOrder) — the flattened bucket order becomes the real sortOrder, since
  // that's the same order students see when taking the quiz.
  const questionGroups = groupQuestionsByPage(detail.questions, pagesById);

  function openPicker() {
    setPicking(true);
    setPickerTab("bank");
    if (!bank) {
      questionBankApi.questions(token).then(setBank).catch(() => setBank([]));
    }
    if (categories.length === 0) {
      questionBankApi.categories(token).then(setCategories).catch(() => {});
    }
  }

  const createAudience = isAcademic ? "IELTS" : "KIDS";

  function refreshCreateCategories() {
    questionBankApi.categories(token, createAudience).then(setCreateCategories).catch(() => {});
  }

  function ensureFormData() {
    if (createCategories.length === 0) refreshCreateCategories();
    if (passages.length === 0) {
      questionBankApi.passages(token).then(setPassages).catch(() => {});
    }
    if (tags.length === 0) {
      questionBankApi.tags(token).then(setTags).catch(() => {});
    }
  }

  function openCreateTab() {
    setPickerTab("create");
    ensureFormData();
  }

  // Sửa câu hỏi ngay tại trang quiz — cả câu đã gắn lẫn câu đang chọn trong tab
  // ngân hàng — không cần rời trang sang /teacher/questions/[id] như trước.
  function openEdit(questionId: number) {
    setEditingId(questionId);
    setEditingDetail(null);
    ensureFormData();
    questionBankApi.question(token, questionId).then(setEditingDetail).catch(() => {
      setError("Không tải được câu hỏi để sửa");
      setEditingId(null);
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditingDetail(null);
  }

  function handleQuestionEdited() {
    closeEdit();
    onChanged();
  }

  // Câu hỏi vừa tạo xong (từ form nhúng ngay trong quiz) được gán luôn vào
  // Part/điểm đang chọn — không cần quay lại ngân hàng câu hỏi để tìm và gán
  // thủ công như trước.
  async function handleQuestionCreated(q: QuestionDetail) {
    setError(null);
    try {
      await quizAdminApi.importQuestions(token, detail.quiz.id, {
        questionIds: [q.id],
        mark: Number(mark) || 1,
        pageId: pageId ? Number(pageId) : undefined,
      });
      setBank(null);
      setPicking(false);
      setPickerTab("bank");
      onChanged();
      toast.success("Đã tạo và gán câu hỏi vào quiz");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gán câu hỏi vừa tạo thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function importSelected() {
    if (selected.size === 0) return;
    setError(null);
    try {
      await quizAdminApi.importQuestions(token, detail.quiz.id, {
        questionIds: [...selected],
        mark: Number(mark) || 1,
        pageId: pageId ? Number(pageId) : undefined,
      });
      setSelected(new Set());
      setPicking(false);
      onChanged();
      toast.success(`Đã thêm ${selected.size} câu hỏi vào quiz`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Thêm câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function removeQuestion(quizQuestionId: number) {
    if (!(await confirm("Gỡ câu hỏi này khỏi quiz?"))) return;
    try {
      await quizAdminApi.removeQuestion(token, quizQuestionId);
      onChanged();
      toast.success("Đã gỡ câu hỏi khỏi quiz");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gỡ câu hỏi thất bại");
    }
  }

  async function updateMark(quizQuestionId: number, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    try {
      await quizAdminApi.updateQuestionMark(token, quizQuestionId, parsed);
      onChanged();
      toast.success("Đã cập nhật điểm câu hỏi");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sửa điểm câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  function openGroupIntroEditor(q: QuizQuestionAdmin) {
    setEditingGroupIntroFor(q.quizQuestionId);
    setGroupIntroDraft(q.groupIntro ?? "");
  }

  async function saveGroupIntro(quizQuestionId: number) {
    setSavingGroupIntro(true);
    try {
      await quizAdminApi.updateGroupIntro(token, quizQuestionId, groupIntroDraft);
      setEditingGroupIntroFor(null);
      onChanged();
      toast.success(groupIntroDraft.trim() ? "Đã lưu tiêu đề nhóm" : "Đã gỡ tiêu đề nhóm");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lưu tiêu đề nhóm thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingGroupIntro(false);
    }
  }

  const totalMark = detail.questions.reduce((sum, q) => sum + Number(q.mark), 0);

  // Reordering only ever happens within one Part's own list (dragging across
  // Parts would silently snap back, since group membership comes from pageId,
  // not from where a row is dropped) — after moving within the group, rebuild
  // the full cross-group order and persist that as the new sortOrder.
  async function handleGroupDragEnd(groupItems: QuizQuestionAdmin[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groupItems.findIndex((q) => q.quizQuestionId === active.id);
    const newIndex = groupItems.findIndex((q) => q.quizQuestionId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedGroup = arrayMove(groupItems, oldIndex, newIndex);
    const fullOrder = questionGroups.flatMap((g) => (g.items === groupItems ? reorderedGroup : g.items));
    try {
      await quizAdminApi.reorderQuestions(
        token,
        detail.quiz.id,
        fullOrder.map((q) => q.quizQuestionId),
      );
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sắp xếp câu hỏi thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  // Self-heal: if the persisted sortOrder doesn't already match Part grouping
  // (e.g. content imported before this grouping existed, with sortOrder that
  // jumps between Parts), normalize it once so the exam-taking order always
  // matches exactly what's displayed here — never leave the two diverging.
  useEffect(() => {
    const desired = questionGroups.flatMap((g) => g.items.map((q) => q.quizQuestionId));
    const current = detail.questions.map((q) => q.quizQuestionId);
    const alreadyGrouped =
      desired.length === current.length && desired.every((id, i) => id === current[i]);
    if (!alreadyGrouped) {
      quizAdminApi.reorderQuestions(token, detail.quiz.id, desired).then(onChanged).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.questions]);

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Câu hỏi ({detail.questions.length})</h2>
          {detail.questions.length > 0 && (
            <span className="text-sm text-muted">
              Tổng điểm: <span className="font-semibold text-text">{totalMark}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={openPicker}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          + Thêm câu hỏi
        </button>
      </div>

      {detail.questions.length === 0 ? (
        <p className="text-sm text-muted">Chưa có câu hỏi nào trong quiz này.</p>
      ) : (
        <div className="space-y-5">
          {questionGroups.map((group) => (
            <div key={group.pageId ?? "unassigned"}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={
                    group.page
                      ? "rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent"
                      : "rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted"
                  }
                >
                  {group.page
                    ? `Part ${group.page.pageNumber}${group.page.partLabel ? ` — ${group.page.partLabel}` : ""}`
                    : "Chưa gán trang"}
                </span>
                <span className="text-xs text-faint">{group.items.length} câu</span>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleGroupDragEnd(group.items, event)}
              >
                <SortableContext
                  items={group.items.map((q) => q.quizQuestionId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {group.items.map((q) => {
                      const canGroupIntro = q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE_NOT_GIVEN";
                      return (
                      <li key={q.quizQuestionId}>
                        <SortableRow id={q.quizQuestionId} editMode={editMode}>
                          <div className="flex items-center gap-3 rounded-lg bg-soft px-3 py-2 text-sm">
                            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                              {q.type}
                            </span>
                            <span className="flex-1">{q.name}</span>
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <input
                                type="number"
                                min={0}
                                step="0.5"
                                defaultValue={q.mark}
                                key={`${q.quizQuestionId}-${q.mark}`}
                                onBlur={(e) => updateMark(q.quizQuestionId, e.target.value)}
                                className="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-xs"
                              />
                              điểm
                            </span>
                            {canGroupIntro && (
                              <button
                                type="button"
                                onClick={() => openGroupIntroEditor(q)}
                                title="Đoạn hướng dẫn dùng chung cho nhóm câu hỏi bắt đầu từ đây (vd 'Questions 14-19, Choose...') - không đụng nội dung câu hỏi ở ngân hàng câu hỏi"
                                className={`text-xs font-semibold ${q.groupIntro ? "text-accent" : "text-faint hover:text-accent"}`}
                              >
                                {q.groupIntro ? "Tiêu đề nhóm ✓" : "+ Tiêu đề nhóm"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(q.questionId)}
                              className="text-xs font-semibold text-primary"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.quizQuestionId)}
                              className="text-xs text-red"
                            >
                              Gỡ
                            </button>
                          </div>
                          {editingGroupIntroFor === q.quizQuestionId && (
                            <div className="mt-2 space-y-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
                              <p className="text-xs text-muted">
                                Đoạn này hiện dùng chung phía trên câu <strong>{q.name}</strong> và mọi
                                câu Trắc nghiệm/Đúng-Sai-NG liền sau nó, cho tới câu kế tiếp có tiêu đề
                                nhóm riêng (hoặc hết trang). Để trống rồi lưu để gỡ.
                              </p>
                              <RichTextEditor value={groupIntroDraft} onChange={setGroupIntroDraft} token={token} />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={savingGroupIntro}
                                  onClick={() => saveGroupIntro(q.quizQuestionId)}
                                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {savingGroupIntro ? "Đang lưu…" : "Lưu"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGroupIntroFor(null)}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          )}
                        </SortableRow>
                      </li>
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          ))}
        </div>
      )}

      {editingId !== null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
          onClick={closeEdit}
        >
          <div
            className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Sửa câu hỏi</h3>
              <button type="button" onClick={closeEdit} className="text-xs text-muted">
                Đóng
              </button>
            </div>
            {!editingDetail ? (
              <p className="text-sm text-muted">Đang tải…</p>
            ) : (
              <QuestionForm
                mode="edit"
                initial={editingDetail}
                categories={createCategories}
                passages={passages}
                tags={tags}
                token={token}
                onSaved={handleQuestionEdited}
                onCategoriesChanged={refreshCreateCategories}
              />
            )}
          </div>
        </div>
      )}

      {picking && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
          onClick={() => setPicking(false)}
        >
        <div
          className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-soft p-1">
              <button
                type="button"
                onClick={() => setPickerTab("bank")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  pickerTab === "bank" ? "bg-surface text-text shadow-sm" : "text-muted"
                }`}
              >
                Chọn từ ngân hàng
              </button>
              <button
                type="button"
                onClick={openCreateTab}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  pickerTab === "create" ? "bg-surface text-text shadow-sm" : "text-muted"
                }`}
              >
                + Tạo câu hỏi mới
              </button>
            </div>
            <button type="button" onClick={() => setPicking(false)} className="text-xs text-muted">
              Đóng
            </button>
            {pickerTab === "bank" && (
              <div className="w-56">
                <SearchableSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  allowClear
                  clearLabel="— Tất cả danh mục —"
                  placeholder="Lọc theo danh mục…"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: categoryOptionLabel(c, categories),
                  }))}
                />
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-end gap-3 border-b border-border pb-3">
            {isAcademic && (
              <label className="flex items-center gap-2 text-xs text-muted">
                Gán vào trang:
                <select
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value ? Number(e.target.value) : "")}
                  className="input py-1 text-xs"
                >
                  <option value="">— Không gán trang —</option>
                  {detail.pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      Part {p.pageNumber}
                      {p.partLabel ? ` — ${p.partLabel}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-muted">
              Điểm mỗi câu:
              <input
                type="number"
                value={mark}
                onChange={(e) => setMark(e.target.value)}
                className="input w-16 py-1 text-xs"
              />
            </label>
          </div>
          {error && <p className="mb-2 text-xs text-red">{error}</p>}

          {pickerTab === "bank" ? (
            <>
              {bank === null ? (
                <p className="text-sm text-muted">Đang tải…</p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {bank
                    .filter((q) => !attachedIds.has(q.id))
                    .filter((q) => categoryFilter === "" || q.categoryId === categoryFilter)
                    .map((q) => (
                      <li key={q.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-soft">
                          <input
                            type="checkbox"
                            checked={selected.has(q.id)}
                            onChange={() => toggle(q.id)}
                          />
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                            {q.type}
                          </span>
                          <span className="flex-1">{q.name}</span>
                          <span className="text-xs text-muted">{q.categoryName}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEdit(q.id);
                            }}
                            className="text-xs font-semibold text-primary"
                          >
                            Sửa
                          </button>
                        </label>
                      </li>
                    ))}
                  {bank
                    .filter((q) => !attachedIds.has(q.id))
                    .filter((q) => categoryFilter === "" || q.categoryId === categoryFilter).length === 0 && (
                    <li className="px-2 py-4 text-center text-sm text-muted">
                      {categoryFilter === ""
                        ? "Không còn câu hỏi nào để thêm (đã dùng hết ngân hàng)."
                        : "Không có câu hỏi nào trong danh mục này."}
                    </li>
                  )}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={importSelected}
                  disabled={selected.size === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Thêm {selected.size > 0 ? `(${selected.size})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
                >
                  Đóng
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-bg p-4">
              <p className="mb-3 text-xs text-muted">
                Tạo xong sẽ tự động gán câu hỏi này vào quiz theo Part/điểm đã chọn ở trên.
              </p>
              <QuestionForm
                key={pageId}
                mode="create"
                categories={createCategories}
                passages={passages}
                tags={tags}
                token={token}
                lockAudience={createAudience}
                onSaved={handleQuestionCreated}
                onCategoriesChanged={refreshCreateCategories}
                initialCategoryId={defaultCategoryId}
                initialPassageId={defaultPassageId}
              />
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-muted"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </section>
  );
}
