"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, classApi } from "@/lib/api";
import type { ClassSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/store/toast";

/**
 * Các lớp đã gắn vào khóa này + ô thêm lớp mới vào khóa (cả lớp được ghi danh ngay). Chỉ hiện với người có
 * quyền enrollment:manage; người chỉ có quyền xem báo cáo (vd giáo viên được cấp riêng 1 khóa) không thấy khung này.
 */
export function CourseClassesPanel({
  token,
  courseId,
  onChanged,
}: {
  token: string;
  courseId: number;
  /** Gọi sau khi gắn lớp xong để trang tải lại danh sách học viên đăng ký. */
  onChanged: () => void;
}) {
  const canManage = useAuthStore((s) => s.systemCapabilities.includes("enrollment:manage"));
  const toast = useToast();
  const [linked, setLinked] = useState<ClassSummary[]>([]);
  const [all, setAll] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    classApi.list(token, courseId).then(setLinked).catch(() => {});
    classApi.list(token).then(setAll).catch(() => {});
  }

  useEffect(() => {
    if (!canManage) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, courseId]);

  if (!canManage) return null;

  const linkedIds = new Set(linked.map((c) => c.id));

  async function link() {
    if (!classId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await classApi.linkCourse(token, Number(classId), courseId);
      toast.success(
        r.memberCount === 0
          ? "Đã gắn lớp vào khóa. Lớp chưa có thành viên nên chưa ghi danh ai."
          : `Đã ghi danh ${r.newlyEnrolled} học viên mới vào khóa (${r.alreadyEnrolled} người đã có sẵn)`,
      );
      setClassId("");
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gắn lớp thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4" data-testid="course-classes-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Lớp đã gắn vào khóa</h2>
          <p className="text-xs text-muted">
            Gắn một lớp thì cả lớp được ghi danh khóa này; thành viên vào lớp sau cũng tự được ghi danh.
          </p>
        </div>
        <Link href="/admin/classes" className="text-sm font-semibold text-accent hover:underline">
          Quản lý lớp học →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {linked.length === 0 ? (
          <span className="text-sm text-muted">Chưa có lớp nào gắn vào khóa này.</span>
        ) : (
          linked.map((c) => (
            <Link
              key={c.id}
              href={`/admin/classes/${c.id}`}
              className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary hover:opacity-80"
            >
              {c.name} · {c.memberCount}
            </Link>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="input w-64 text-sm"
          aria-label="Chọn lớp để gắn vào khóa"
        >
          <option value="">— Chọn lớp —</option>
          {all
            .filter((c) => !linkedIds.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.memberCount} thành viên)
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={link}
          disabled={!classId || busy}
          className="rounded-lg bg-primary-fill px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Đang gắn…" : "Thêm lớp vào khóa"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
    </div>
  );
}
