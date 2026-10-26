"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { ApiError, catalogAdminApi, classApi, enrollmentApi } from "@/lib/api";
import type { ClassSummary, CourseSummary } from "@/lib/types";
import { useToast } from "@/store/toast";

/** Ghi danh các tài khoản đã chọn vào 1 khóa đã xuất bản (bỏ qua người đã ghi danh). */
export function AddToCourseDialog({
  token,
  userIds,
  onClose,
  onDone,
}: {
  token: string;
  userIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogAdminApi
      .courses(token)
      .then((list) => setCourses(list.filter((c) => c.status === "PUBLISHED")))
      .catch(() => setError("Không tải được danh sách khóa học"));
  }, [token]);

  async function submit() {
    if (!courseId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await enrollmentApi.bulkEnroll(token, userIds, Number(courseId));
      const parts = [`Đã ghi danh ${r.enrolled} tài khoản mới`];
      if (r.alreadyEnrolled > 0) parts.push(`${r.alreadyEnrolled} tài khoản đã có sẵn trong khóa`);
      if (r.notFound > 0) parts.push(`${r.notFound} không tìm thấy`);
      toast.success(parts.join(", "));
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ghi danh thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Thêm ${userIds.length} tài khoản vào khóa học`} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        Chỉ hiện các khóa đã xuất bản. Tài khoản nào đã ghi danh khóa này sẽ được bỏ qua.
      </p>
      {courses == null && !error ? (
        <p className="text-sm text-muted">Đang tải…</p>
      ) : (
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="input w-full"
          aria-label="Chọn khóa học"
        >
          <option value="">— Chọn khóa học —</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-text">
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!courseId || busy}
          className="rounded-lg bg-primary-fill px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Đang ghi danh…" : "Ghi danh"}
        </button>
      </div>
    </Dialog>
  );
}

/** Thêm các tài khoản đã chọn vào 1 lớp có sẵn, hoặc tạo lớp mới rồi thêm luôn. */
export function AddToClassDialog({
  token,
  userIds,
  onClose,
  onDone,
}: {
  token: string;
  userIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [classId, setClassId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    classApi
      .list(token)
      .then(setClasses)
      .catch(() => setError("Không tải được danh sách lớp"));
  }, [token]);

  const creatingNew = classId === "new";
  const canSubmit = creatingNew ? newName.trim().length > 0 : classId !== "";

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let targetId: number;
      if (creatingNew) {
        targetId = (await classApi.create(token, { name: newName.trim() })).id;
      } else {
        targetId = Number(classId);
      }
      const r = await classApi.addMembers(token, targetId, userIds);
      const parts = [`Đã thêm ${r.added} tài khoản vào lớp`];
      if (r.alreadyInClass > 0) parts.push(`${r.alreadyInClass} đã có trong lớp`);
      if (r.newlyEnrolled > 0) parts.push(`${r.newlyEnrolled} lượt ghi danh khóa học mới`);
      toast.success(parts.join(", "));
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm vào lớp thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Thêm ${userIds.length} tài khoản vào lớp`} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        Nếu lớp đã được gắn vào khóa học nào thì các tài khoản mới vào lớp cũng tự được ghi danh khóa đó.
      </p>
      {classes == null && !error ? (
        <p className="text-sm text-muted">Đang tải…</p>
      ) : (
        <div className="space-y-3">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="input w-full"
            aria-label="Chọn lớp"
          >
            <option value="">— Chọn lớp —</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.memberCount} thành viên)
              </option>
            ))}
            <option value="new">+ Tạo lớp mới…</option>
          </select>
          {creatingNew && (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={150}
              placeholder="Tên lớp mới, ví dụ: IELTS 6.5 tối 2-4-6"
              className="input w-full"
              aria-label="Tên lớp mới"
              autoFocus
            />
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-text">
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || busy}
          className="rounded-lg bg-primary-fill px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Đang thêm…" : "Thêm vào lớp"}
        </button>
      </div>
    </Dialog>
  );
}
