"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, catalogAdminApi, catalogApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Category, CourseAudienceGroup, CourseSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Bản nháp", cls: "bg-soft text-muted" },
  PUBLISHED: { label: "Đã xuất bản", cls: "bg-green-soft text-green" },
  ARCHIVED: { label: "Lưu trữ", cls: "bg-red-soft text-red" },
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [examTemplates, setExamTemplates] = useState<{ code: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
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

  const refreshCategories = () => catalogApi.categories().then(setCategories).catch(() => {});
  const refreshCourses = () =>
    catalogAdminApi
      .courses(token, activeCategory ?? undefined)
      .then(setCourses)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Lỗi tải khóa học"));

  useEffect(() => {
    if (!allowed) return;
    refreshCategories();
    catalogApi.examTemplates().then(setExamTemplates).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    refreshCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, activeCategory]);

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
      <PageHeader title="Quản lý khóa học" backHref="/dashboard" backLabel="Bảng điều khiển" />

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[280px_1fr]">
        <CategoryPanel
          categories={categories}
          examTemplates={examTemplates}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          onChanged={refreshCategories}
          token={token}
        />

        <main>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Khóa học ({courses.length})</h1>
          </div>
          {error && <p className="mb-3 text-sm text-red">{error}</p>}
          <CreateCourseForm
            categories={categories}
            defaultCategoryId={activeCategory}
            token={token}
            onCreated={refreshCourses}
          />
          <ul className="mt-4 space-y-2">
            {courses.length === 0 ? (
              <li className="rounded-card border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
                Chưa có khóa học nào trong mục này.
              </li>
            ) : (
              courses.map((c) => {
                const st = STATUS_META[c.status] ?? STATUS_META.DRAFT;
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.title}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {c.categoryName} · {formatPrice(c.price)} · {c.enrolledCount} học viên
                      </p>
                    </div>
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Quản lý →
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </main>
      </div>
    </div>
  );
}

function CategoryPanel({
  categories,
  examTemplates,
  activeCategory,
  onSelect,
  onChanged,
  token,
}: {
  categories: Category[];
  examTemplates: { code: string; name: string }[];
  activeCategory: number | null;
  onSelect: (id: number | null) => void;
  onChanged: () => void;
  token: string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examTemplateCode, setExamTemplateCode] = useState("");
  const [audienceGroup, setAudienceGroup] = useState<CourseAudienceGroup>("IELTS");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await catalogAdminApi.createCategory(token, {
        name,
        description: description || undefined,
        examTemplateCode: examTemplateCode || undefined,
        audienceGroup,
      });
      setName("");
      setDescription("");
      setExamTemplateCode("");
      setAudienceGroup("IELTS");
      setCreating(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo danh mục thất bại");
    }
  }

  return (
    <aside className="md:sticky md:top-8 md:self-start">
      <div className="rounded-card border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Danh mục</h2>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="text-xs font-semibold text-accent"
          >
            {creating ? "Hủy" : "+ Mới"}
          </button>
        </div>

        {creating && (
          <form onSubmit={submit} className="mb-3 space-y-2 border-b border-border pb-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên danh mục"
              className="input text-sm"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả (tùy chọn)"
              className="input text-sm"
            />
            <select
              value={examTemplateCode}
              onChange={(e) => setExamTemplateCode(e.target.value)}
              className="input text-sm"
            >
              <option value="">Không gắn exam template</option>
              {examTemplates.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={audienceGroup}
              onChange={(e) => setAudienceGroup(e.target.value as CourseAudienceGroup)}
              className="input text-sm"
            >
              <option value="IELTS">Nhóm: IELTS</option>
              <option value="TRE_EM">Nhóm: Trẻ em</option>
              <option value="TIEU_HOC">Nhóm: Tiểu học</option>
            </select>
            {error && <p className="text-xs text-red">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white"
            >
              Tạo danh mục
            </button>
          </form>
        )}

        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeCategory === null
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-text hover:bg-soft"
              }`}
            >
              Tất cả
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  activeCategory === c.id
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-text hover:bg-soft"
                }`}
              >
                {c.name}
                <span className="flex items-center gap-1">
                  {c.audienceGroup !== "IELTS" && (
                    <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                      {c.audienceGroup === "TRE_EM" ? "Trẻ em" : "Tiểu học"}
                    </span>
                  )}
                  {c.examTemplate && (
                    <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-bold text-red">
                      {c.examTemplate.code}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function CreateCourseForm({
  categories,
  defaultCategoryId,
  token,
  onCreated,
}: {
  categories: Category[];
  defaultCategoryId: number | null;
  token: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [shortname, setShortname] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCategoryId != null) setCategoryId(defaultCategoryId);
  }, [defaultCategoryId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Chọn danh mục");
      return;
    }
    try {
      await catalogAdminApi.createCourse(token, {
        categoryId: Number(categoryId),
        title,
        shortname: shortname || title,
        summary: summary || undefined,
        price: price ? Number(price) : undefined,
        coverImageUrl: coverImageUrl || undefined,
        status: "DRAFT",
      });
      setTitle("");
      setShortname("");
      setSummary("");
      setPrice("");
      setCoverImageUrl(null);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo khóa học thất bại");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        + Khóa học mới
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Danh mục</span>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="input text-sm"
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Giá (VNĐ)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="input text-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Tiêu đề khóa học</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="IELTS Foundation"
          className="input text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          shortname (URL, để trống sẽ tự sinh từ tiêu đề)
        </span>
        <input
          value={shortname}
          onChange={(e) => setShortname(e.target.value)}
          placeholder="ielts-foundation"
          className="input text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Mô tả ngắn</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="input text-sm"
        />
      </label>
      <ImageUploadField token={token} value={coverImageUrl} onChange={setCoverImageUrl} />
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white"
        >
          Tạo khóa học (bản nháp)
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
