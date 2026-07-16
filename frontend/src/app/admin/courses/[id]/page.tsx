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
import { useEffect, useState } from "react";
import { HomeworkMaterialsEditor } from "@/components/HomeworkMaterialsEditor";
import { ImageUploadField } from "@/components/ImageUploadField";
import { PageHeader } from "@/components/PageHeader";
import { SortableRow } from "@/components/SortableRow";
import { SubtitleUploadField } from "@/components/SubtitleUploadField";
import { VideoUploadField } from "@/components/VideoUploadField";
import { ApiError, catalogAdminApi, catalogApi, quizAdminApi } from "@/lib/api";
import type { CourseDetail, QuizSummary, Section } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/store/confirm";
import { useEditModeStore } from "@/store/editMode";

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
    catalogApi
      .course(courseId)
      .then(setCourse)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được khóa học"));

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
        maxWidthClass="max-w-4xl"
        showEditModeToggle
      />

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}
        {!course ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <>
            <CourseEditForm course={course} token={token} onSaved={refresh} />
            <SectionsPanel course={course} token={token} onChanged={refresh} />
          </>
        )}
      </main>
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(course.title);
    setSummary(course.summary ?? "");
    setPrice(String(course.price));
    setStatus(course.status);
    setCoverImageUrl(course.coverImageUrl);
  }, [course]);

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
      });
      setMsg("Đã lưu");
      setTimeout(() => setMsg(null), 2000);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!(await confirm(`Xóa khóa học "${course.title}"? Hành động này không thể hoàn tác.`)))
      return;
    await catalogAdminApi.deleteCourse(token, course.id);
    router.push("/admin/courses");
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
        <button type="button" onClick={remove} className="text-sm text-red">
          Xóa khóa học
        </button>
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

function SectionsPanel({
  course,
  token,
  onChanged,
}: {
  course: CourseDetail;
  token: string;
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const editMode = useEditModeStore((s) => s.enabled);
  const sensors = useSensors(useSensor(PointerSensor));
  const confirm = useConfirm();

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo section thất bại");
    }
  }

  async function removeSection(id: number) {
    if (!(await confirm("Xóa section này? Mọi quiz bên trong cũng sẽ bị xóa."))) return;
    await catalogAdminApi.deleteSection(token, id);
    onChanged();
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
      setError(err instanceof ApiError ? err.message : "Sắp xếp section thất bại");
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
                <SortableRow key={s.id} id={s.id} editMode={editMode}>
                  <SectionCard
                    section={s}
                    token={token}
                    onRemove={() => removeSection(s.id)}
                    onChanged={onChanged}
                  />
                </SortableRow>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}

function SectionCard({
  section,
  token,
  onRemove,
  onChanged,
}: {
  section: Section;
  token: string;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const editMode = useEditModeStore((s) => s.enabled);
  const sensors = useSensors(useSensor(PointerSensor));

  function loadQuizzes() {
    quizAdminApi.listBySection(token, section.id).then(setQuizzes).catch(() => setQuizzes([]));
  }

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      await quizAdminApi.create(token, { sectionId: section.id, title, status: "DRAFT" });
      setTitle("");
      setCreating(false);
      loadQuizzes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo quiz thất bại");
    }
  }

  async function handleVideoChange(url: string | null) {
    try {
      await catalogAdminApi.updateSection(token, section.id, { videoUrl: url ?? "" });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật video thất bại");
    }
  }

  async function handleSubtitleChange(url: string | null) {
    try {
      await catalogAdminApi.updateSection(token, section.id, { subtitleUrl: url ?? "" });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật phụ đề thất bại");
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
      setError(err instanceof ApiError ? err.message : "Sắp xếp quiz thất bại");
      loadQuizzes();
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{section.title}</h3>
        <div className="flex items-center gap-3">
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

      <div className="mb-3">
        <SubtitleUploadField
          token={token}
          value={section.subtitleUrl}
          onChange={handleSubtitleChange}
        />
      </div>

      <div className="mb-3">
        <HomeworkMaterialsEditor sectionId={section.id} token={token} />
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
