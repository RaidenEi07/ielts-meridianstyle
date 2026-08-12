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
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BulkRenameDialog } from "@/components/BulkRenameDialog";
import { CharacterDubbingEditor } from "@/components/CharacterDubbingEditor";
import { HomeworkMaterialsEditor } from "@/components/HomeworkMaterialsEditor";
import { ImageUploadField } from "@/components/ImageUploadField";
import { PageHeader } from "@/components/PageHeader";
import { RecordingsGradingPanel } from "@/components/RecordingsGradingPanel";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SectionDescriptionField } from "@/components/SectionDescriptionField";
import { SortableRow } from "@/components/SortableRow";
import { VocabAdminPanel } from "@/components/VocabAdminPanel";
import { VideoCheckpointsEditor } from "@/components/VideoCheckpointsEditor";
import { VideoUploadField } from "@/components/VideoUploadField";
import { ApiError, catalogAdminApi, catalogApi, childSiteAdminApi, quizAdminApi } from "@/lib/api";
import type {
  ChildSite,
  CourseAudienceGroup,
  CourseDetail,
  DistributeResult,
  QuizSummary,
  Section,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useEditModeStore } from "@/store/editMode";
import { useToast } from "@/store/toast";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Bản nháp", cls: "bg-soft text-muted" },
  PUBLISHED: { label: "Đã xuất bản", cls: "bg-green-soft text-green" },
  ARCHIVED: { label: "Lưu trữ", cls: "bg-red-soft text-red" },
};

export default function AdminCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionSearch, setSectionSearch] = useState("");
  const [quizRefreshTick, setQuizRefreshTick] = useState(0);

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

  const refresh = () => {
    setQuizRefreshTick((t) => t + 1);
    return catalogApi
      .course(courseId)
      .then(setCourse)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được khóa học"));
  };

  useEffect(() => {
    if (!allowed) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, courseId]);

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
        title="Chi tiết khóa học"
        backHref="/admin/courses"
        backLabel="Danh sách khóa học"
        maxWidthClass="max-w-5xl"
        showEditModeToggle
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        {course && course.sections.length > 0 && (
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            <div className="rounded-[18px] border border-border bg-surface p-4">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Mục lục
              </h3>
              {course.sections.length > 5 && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                  <input
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    placeholder="Tìm section…"
                    className="input w-full py-1.5 pl-8 text-xs"
                  />
                </div>
              )}
              <nav className="space-y-0.5">
                {course.sections
                  .map((s, i) => ({ s, i }))
                  .filter(({ s }) =>
                    s.title.toLowerCase().includes(sectionSearch.trim().toLowerCase()),
                  )
                  .map(({ s, i }) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(`admin-section-${s.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-soft hover:text-text"
                    >
                      <span className="shrink-0 font-mono text-xs text-faint">{i + 1}.</span>
                      <span className="line-clamp-2">{s.title}</span>
                    </button>
                  ))}
                {sectionSearch.trim() &&
                  !course.sections.some((s) =>
                    s.title.toLowerCase().includes(sectionSearch.trim().toLowerCase()),
                  ) && <p className="px-2 py-1.5 text-xs text-faint">Không tìm thấy section nào.</p>}
              </nav>
            </div>
          </aside>
        )}

        <main className="space-y-6">
          {error && <p className="text-sm text-red">{error}</p>}
          {!course ? (
            <p className="text-muted">Đang tải…</p>
          ) : (
            <>
              <CourseEditForm course={course} token={token} onSaved={refresh} />
              <CourseQuizzesPanel
                course={course}
                token={token}
                refreshTick={quizRefreshTick}
                onChanged={refresh}
              />
              <SectionsPanel
                course={course}
                token={token}
                quizRefreshTick={quizRefreshTick}
                onChanged={refresh}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CourseEditForm({
  course,
  token,
  onSaved,
}: {
  course: CourseDetail;
  token: string;
  onSaved: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [title, setTitle] = useState(course.title);
  const [summary, setSummary] = useState(course.summary ?? "");
  const [price, setPrice] = useState(String(course.price));
  const [status, setStatus] = useState(course.status);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(course.coverImageUrl);
  const [descriptionHtml, setDescriptionHtml] = useState(course.descriptionHtml ?? "");
  const [objectives, setObjectives] = useState<string[]>(course.objectives);
  const [newObjective, setNewObjective] = useState("");
  const [prerequisites, setPrerequisites] = useState(course.prerequisites ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function addObjective() {
    if (!newObjective.trim()) return;
    setObjectives((prev) => [...prev, newObjective.trim()]);
    setNewObjective("");
  }

  function removeObjective(index: number) {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await catalogAdminApi.updateCourse(token, course.id, {
        title,
        summary,
        price: Number(price),
        status,
        coverImageUrl: coverImageUrl ?? "",
        descriptionHtml,
        objectives,
        prerequisites,
      });
      setMsg("Đã lưu");
      setTimeout(() => setMsg(null), 2000);
      onSaved();
      toast.success("Đã lưu thay đổi khóa học");
    } catch (err) {
      const errMsg = err instanceof ApiError ? err.message : "Lưu thất bại";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await confirm(`Xóa khóa học "${course.title}"? Hành động này không thể hoàn tác.`)))
      return;
    try {
      await catalogAdminApi.deleteCourse(token, course.id);
      toast.success("Đã xóa khóa học");
      router.push("/admin/courses");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa khóa học thất bại");
    }
  }

  const st = STATUS_META[course.status] ?? STATUS_META.DRAFT;

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{course.title}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
            {st.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <DistributeCourseButton courseId={course.id} token={token} />
          <button type="button" onClick={remove} className="text-sm text-red">
            Xóa khóa học
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">
        {course.categoryName} · shortname: {course.shortname}
        {course.examTemplateCode && ` · Exam template: ${course.examTemplateCode}`}
      </p>

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Tiêu đề</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Giá (VNĐ)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Trạng thái</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Mô tả ngắn</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="input"
          />
        </label>
        <div className="sm:col-span-2">
          <ImageUploadField token={token} value={coverImageUrl} onChange={setCoverImageUrl} />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Mô tả chi tiết</span>
          <RichTextEditor value={descriptionHtml} onChange={setDescriptionHtml} token={token} />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Mục tiêu khóa học</span>
          {objectives.length > 0 && (
            <ul className="mb-2 space-y-1">
              {objectives.map((o, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  <span>{o}</span>
                  <button
                    type="button"
                    onClick={() => removeObjective(i)}
                    className="text-faint hover:text-red"
                    title="Xóa mục tiêu"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addObjective();
                }
              }}
              placeholder="Vd: Nắm vững 500 từ vựng chủ đề gia đình"
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={addObjective}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
            >
              + Thêm
            </button>
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Yêu cầu đầu vào</span>
          <textarea
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            rows={2}
            placeholder="Vd: Đã hoàn thành khóa Starters, đọc viết được bảng chữ cái"
            className="input"
          />
        </label>

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

function DistributeCourseButton({ courseId, token }: { courseId: number; token: string }) {
  const isMaster = useAuthStore((s) => s.isMaster);
  const hasCapability = useAuthStore((s) => s.hasCapability);
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<ChildSite[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<DistributeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  if (!isMaster || !hasCapability("course:distribute")) {
    return null;
  }

  function openPanel() {
    setOpen(true);
    setResults(null);
    setError(null);
    childSiteAdminApi.list(token).then(setSites).catch(() => setSites([]));
  }

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function send() {
    if (selected.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await catalogAdminApi.distribute(token, courseId, selected);
      setResults(res);
      const okCount = res.filter((r) => r.success).length;
      if (okCount === res.length) {
        toast.success(`Đã gửi tới ${okCount} web con`);
      } else {
        toast.error(`Gửi thành công ${okCount}/${res.length} web con — xem chi tiết bên dưới`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gửi thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={openPanel} className="text-sm font-semibold text-accent">
        Gửi tới web con
      </button>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-accent">
        Gửi tới web con ▴
      </button>
      <div className="absolute right-0 top-full z-10 mt-2 w-80 rounded-card border border-border bg-surface p-4 text-left shadow-[0_16px_40px_-10px_rgba(38,33,27,.35)]">
        <p className="mb-2 text-xs text-muted">
          Chọn web con để gửi 1 bản sao độc lập của khóa học này. Gửi lại khóa học đã gửi trước
          đó sẽ cập nhật bản sao cũ trên web con.
        </p>
        {sites === null ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted">Chưa có web con nào được đăng ký.</p>
        ) : (
          <ul className="mb-3 space-y-1.5">
            {sites.map((s) => (
              <li key={s.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span>{s.name}</span>
                  <span className="text-xs text-muted">({s.baseUrl})</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mb-2 text-xs text-red">{error}</p>}

        {results && (
          <ul className="mb-3 space-y-1 border-t border-border pt-2">
            {results.map((r) => (
              <li key={r.childSiteId} className="text-xs">
                <span className={r.success ? "text-green" : "text-red"}>
                  {r.success ? "✓" : "✗"} {r.childSiteName ?? `#${r.childSiteId}`}
                </span>
                {!r.success && r.message && <span className="text-muted"> — {r.message}</span>}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || selected.length === 0}
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sending ? "Đang gửi…" : `Gửi (${selected.length})`}
        </button>
      </div>
    </div>
  );
}

interface QuizWithSection {
  quiz: QuizSummary;
  sectionTitle: string;
}

function CourseQuizzesPanel({
  course,
  token,
  refreshTick,
  onChanged,
}: {
  course: CourseDetail;
  token: string;
  refreshTick: number;
  onChanged: () => void;
}) {
  const [quizGroups, setQuizGroups] = useState<QuizWithSection[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  function loadQuizzes() {
    Promise.all(
      course.sections.map((s) =>
        quizAdminApi
          .listBySection(token, s.id)
          .then((quizzes) => quizzes.map((quiz) => ({ quiz, sectionTitle: s.title }))),
      ),
    )
      .then((groups) => setQuizGroups(groups.flat()))
      .catch(() => setQuizGroups([]));
  }

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.sections.map((s) => s.id).join(","), refreshTick]);

  if (!quizGroups || quizGroups.length === 0) return null;

  const filteredGroups = search.trim()
    ? quizGroups.filter(
        (g) =>
          g.quiz.title.toLowerCase().includes(search.trim().toLowerCase()) ||
          g.sectionTitle.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : quizGroups;

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
      filteredGroups.every((g) => prev.has(g.quiz.id))
        ? new Set([...prev].filter((id) => !filteredGroups.some((g) => g.quiz.id === id)))
        : new Set([...prev, ...filteredGroups.map((g) => g.quiz.id)]),
    );
  }

  async function bulkPublish() {
    const targets = quizGroups!.filter((g) => selected.has(g.quiz.id) && g.quiz.status === "DRAFT");
    if (targets.length === 0) {
      toast.error("Không có quiz Bản nháp nào trong số đã chọn để xuất bản");
      return;
    }
    setBulkWorking(true);
    try {
      await Promise.all(
        targets.map((g) => quizAdminApi.update(token, g.quiz.id, { status: "PUBLISHED" })),
      );
      setSelected(new Set());
      loadQuizzes();
      onChanged();
      toast.success(`Đã xuất bản ${targets.length} quiz`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xuất bản hàng loạt thất bại");
    } finally {
      setBulkWorking(false);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!(await confirm(`Xóa ${selected.size} quiz đã chọn? Hành động này không thể hoàn tác.`))) {
      return;
    }
    setBulkWorking(true);
    try {
      const count = selected.size;
      await Promise.all([...selected].map((id) => quizAdminApi.remove(token, id)));
      setSelected(new Set());
      loadQuizzes();
      onChanged();
      toast.success(`Đã xóa ${count} quiz`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa hàng loạt thất bại");
    } finally {
      setBulkWorking(false);
    }
  }

  async function applyBulkRename(renames: { id: number; name: string }[]) {
    const count = renames.length;
    await Promise.all(renames.map((r) => quizAdminApi.update(token, r.id, { title: r.name })));
    setSelected(new Set());
    setShowBulkRename(false);
    loadQuizzes();
    onChanged();
    toast.success(`Đã đổi tên ${count} quiz`);
  }

  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted">{quizGroups.length} quiz trong khóa học</span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="font-semibold text-accent hover:underline"
        >
          Quản lý hàng loạt →
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quiz toàn khóa ({quizGroups.length})</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-faint hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên quiz hoặc section…"
                className="input w-full py-2 pl-8 text-sm"
              />
            </div>

            <label className="mb-3 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={filteredGroups.length > 0 && filteredGroups.every((g) => selected.has(g.quiz.id))}
                onChange={toggleSelectAll}
              />
              Chọn tất cả{search.trim() ? " (đang lọc)" : ""}
            </label>

            {selected.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm">
                <span className="font-medium text-primary">{selected.size} quiz đã chọn</span>
                <button
                  type="button"
                  onClick={bulkPublish}
                  disabled={bulkWorking}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-60"
                >
                  Publish hàng loạt
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkRename(true)}
                  disabled={bulkWorking}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-60"
                >
                  Đổi tên hàng loạt
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

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-soft text-muted">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2 font-medium">Tên quiz</th>
                    <th className="px-3 py-2 font-medium">Section</th>
                    <th className="px-3 py-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted">
                        Không tìm thấy quiz nào.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map(({ quiz, sectionTitle }) => {
                      const meta = STATUS_META[quiz.status] ?? {
                        label: quiz.status,
                        cls: "bg-soft text-muted",
                      };
                      return (
                        <tr key={quiz.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(quiz.id)}
                              onChange={() => toggleSelected(quiz.id)}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{quiz.title}</td>
                          <td className="px-3 py-2 text-muted">{sectionTitle}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showBulkRename && (
        <BulkRenameDialog
          items={quizGroups
            .filter((g) => selected.has(g.quiz.id))
            .map((g) => ({ id: g.quiz.id, label: g.quiz.title }))}
          onApply={applyBulkRename}
          onClose={() => setShowBulkRename(false)}
        />
      )}
    </div>
  );
}

function SectionsPanel({
  course,
  token,
  quizRefreshTick,
  onChanged,
}: {
  course: CourseDetail;
  token: string;
  quizRefreshTick: number;
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const editMode = useEditModeStore((s) => s.enabled);
  const sensors = useSensors(useSensor(PointerSensor));
  const confirm = useConfirm();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);

  const sortedSections = [...course.sections].sort((a, b) => a.sortOrder - b.sortOrder);

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
      prev.size === sortedSections.length ? new Set() : new Set(sortedSections.map((s) => s.id)),
    );
  }

  async function bulkDeleteSections() {
    if (selected.size === 0) return;
    if (!(await confirm(`Xóa ${selected.size} section đã chọn? Mọi quiz bên trong cũng sẽ bị xóa.`))) {
      return;
    }
    setBulkWorking(true);
    try {
      const count = selected.size;
      await Promise.all([...selected].map((id) => catalogAdminApi.deleteSection(token, id)));
      setSelected(new Set());
      onChanged();
      toast.success(`Đã xóa ${count} section`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa hàng loạt thất bại");
    } finally {
      setBulkWorking(false);
    }
  }

  async function applyBulkRename(renames: { id: number; name: string }[]) {
    const count = renames.length;
    await Promise.all(renames.map((r) => catalogAdminApi.updateSection(token, r.id, { title: r.name })));
    setSelected(new Set());
    setShowBulkRename(false);
    onChanged();
    toast.success(`Đã đổi tên ${count} section`);
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    try {
      await catalogAdminApi.createSection(token, course.id, {
        title: newTitle,
        sortOrder: course.sections.length,
      });
      setNewTitle("");
      onChanged();
      toast.success("Đã thêm section");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Tạo section thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function removeSection(id: number) {
    if (!(await confirm("Xóa section này? Mọi quiz bên trong cũng sẽ bị xóa."))) return;
    try {
      await catalogAdminApi.deleteSection(token, id);
      onChanged();
      toast.success("Đã xóa section");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa section thất bại");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = course.sections.findIndex((s) => s.id === active.id);
    const newIndex = course.sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(course.sections, oldIndex, newIndex);
    try {
      await catalogAdminApi.reorderSections(token, course.id, reordered.map((s) => s.id));
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sắp xếp section thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="mb-4 text-lg font-semibold">Đề cương (Sections)</h2>

      <form onSubmit={addSection} className="mb-4 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Tên section mới, vd: Tuần 1-4: Nền tảng"
          className="input flex-1"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white"
        >
          + Section
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red">{error}</p>}

      {course.sections.length > 0 && (
        <label className="mb-2 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={selected.size === sortedSections.length}
            onChange={toggleSelectAll}
          />
          Chọn tất cả
        </label>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm">
          <span className="font-medium text-primary">{selected.size} section đã chọn</span>
          <button
            type="button"
            onClick={() => setShowBulkRename(true)}
            disabled={bulkWorking}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-60"
          >
            Đổi tên hàng loạt
          </button>
          <button
            type="button"
            onClick={bulkDeleteSections}
            disabled={bulkWorking}
            className="rounded-lg bg-red px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Xóa ({selected.size})
          </button>
        </div>
      )}

      <div className="space-y-4">
        {course.sections.length === 0 ? (
          <p className="text-sm text-muted">Chưa có section nào.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={course.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {course.sections.map((s) => (
                <div key={s.id} id={`admin-section-${s.id}`} className="flex items-start gap-2 scroll-mt-24">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelected(s.id)}
                    className="mt-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <SortableRow id={s.id} editMode={editMode}>
                      <SectionCard
                        section={s}
                        audienceGroup={course.audienceGroup}
                        token={token}
                        quizRefreshTick={quizRefreshTick}
                        onRemove={() => removeSection(s.id)}
                        onChanged={onChanged}
                      />
                    </SortableRow>
                  </div>
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showBulkRename && (
        <BulkRenameDialog
          items={sortedSections
            .filter((s) => selected.has(s.id))
            .map((s) => ({ id: s.id, label: s.title }))}
          onApply={applyBulkRename}
          onClose={() => setShowBulkRename(false)}
        />
      )}
    </section>
  );
}

function SectionCard({
  section,
  audienceGroup,
  token,
  quizRefreshTick,
  onRemove,
  onChanged,
}: {
  section: Section;
  audienceGroup: CourseAudienceGroup;
  token: string;
  quizRefreshTick: number;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const isAcademic = audienceGroup === "IELTS";
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editMode = useEditModeStore((s) => s.enabled);
  const sensors = useSensors(useSensor(PointerSensor));
  const toast = useToast();

  function loadQuizzes() {
    quizAdminApi.listBySection(token, section.id).then(setQuizzes).catch(() => setQuizzes([]));
  }

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, quizRefreshTick]);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await quizAdminApi.create(token, { sectionId: section.id, title, status: "DRAFT" });
      setTitle("");
      setCreating(false);
      loadQuizzes();
      onChanged();
      toast.success("Đã tạo quiz");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Tạo quiz thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleVideoChange(url: string | null) {
    try {
      await catalogAdminApi.updateSection(token, section.id, { videoUrl: url ?? "" });
      onChanged();
      toast.success("Đã cập nhật video");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Cập nhật video thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  function startEditTitle() {
    setTitleDraft(section.title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === section.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    setError(null);
    try {
      await catalogAdminApi.updateSection(token, section.id, { title: trimmed });
      onChanged();
      toast.success("Đã đổi tên section");
      setEditingTitle(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Đổi tên section thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingTitle(false);
    }
  }

  async function toggleHidden() {
    setError(null);
    try {
      await catalogAdminApi.updateSection(token, section.id, { hidden: !section.hidden });
      onChanged();
      toast.success(section.hidden ? "Đã hiện section" : "Đã ẩn section");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Đổi trạng thái ẩn/hiện thất bại";
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleQuizDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!quizzes || !over || active.id === over.id) return;
    const oldIndex = quizzes.findIndex((q) => q.id === active.id);
    const newIndex = quizzes.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(quizzes, oldIndex, newIndex);
    setQuizzes(reordered);
    try {
      await quizAdminApi.reorderQuizzes(token, reordered.map((q) => q.id));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sắp xếp quiz thất bại";
      setError(msg);
      toast.error(msg);
      loadQuizzes();
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        {editingTitle ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="input flex-1 py-1 text-sm font-semibold"
            />
            <button
              type="button"
              onClick={saveTitle}
              disabled={savingTitle}
              className="text-xs font-semibold text-accent disabled:opacity-60"
            >
              {savingTitle ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              className="text-xs text-muted"
            >
              Hủy
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{section.title}</h3>
            {section.hidden && (
              <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-muted">
                Đã ẩn
              </span>
            )}
            <button
              type="button"
              onClick={startEditTitle}
              className="text-xs font-semibold text-accent"
            >
              Sửa tên
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleHidden} className="text-xs font-semibold text-muted">
            {section.hidden ? "Hiện" : "Ẩn"}
          </button>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="text-xs font-semibold text-accent"
          >
            {creating ? "Hủy" : "+ Quiz"}
          </button>
          <button type="button" onClick={onRemove} className="text-xs text-red">
            Xóa section
          </button>
        </div>
      </div>

      <div className="mb-3">
        <VideoUploadField token={token} value={section.videoUrl} onChange={handleVideoChange} />
      </div>

      {section.videoUrl && (
        <div className="mb-3">
          <VideoCheckpointsEditor
            sectionId={section.id}
            token={token}
            audience={isAcademic ? "IELTS" : "KIDS"}
          />
        </div>
      )}

      <div className="mb-3">
        <SectionDescriptionField
          sectionId={section.id}
          token={token}
          value={section.shortDescription}
          onChanged={onChanged}
        />
      </div>

      {!isAcademic && (
        <div className="mb-3">
          <HomeworkMaterialsEditor sectionId={section.id} token={token} />
        </div>
      )}

      {!isAcademic && (
        <div className="mb-3">
          <RecordingsGradingPanel sectionId={section.id} token={token} />
        </div>
      )}

      {!isAcademic && (
        <div className="mb-3">
          <CharacterDubbingEditor sectionId={section.id} token={token} videoUrl={section.videoUrl} />
        </div>
      )}

      <div className="mb-3">
        <VocabAdminPanel sectionId={section.id} token={token} />
      </div>

      {creating && (
        <form onSubmit={createQuiz} className="mb-3 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên quiz, vd: Reading Practice Test 1"
            className="input flex-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Tạo
          </button>
        </form>
      )}
      {error && <p className="mb-2 text-xs text-red">{error}</p>}

      {quizzes === null ? (
        <p className="text-sm text-muted">Đang tải quiz…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-faint">Chưa có quiz nào trong section này.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuizDragEnd}>
          <SortableContext items={quizzes.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {quizzes.map((q) => {
                const st = STATUS_META[q.status] ?? STATUS_META.DRAFT;
                return (
                  <SortableRow key={q.id} id={q.id} editMode={editMode}>
                    <li className="flex items-center gap-3 rounded-lg bg-soft px-3 py-2 text-sm">
                      <span className="flex-1 font-medium">{q.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-xs text-muted">{q.questionCount} câu</span>
                      <Link
                        href={`/admin/quizzes/${q.id}`}
                        className="text-xs font-semibold text-accent"
                      >
                        Quản lý →
                      </Link>
                    </li>
                  </SortableRow>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
