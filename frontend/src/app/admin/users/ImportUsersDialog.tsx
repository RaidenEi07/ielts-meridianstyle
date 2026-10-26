"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { ApiError, adminUserApi, catalogAdminApi, classApi } from "@/lib/api";
import { downloadCsvTable } from "@/lib/csvDownload";
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_TEMPLATE_HEADER,
  IMPORT_TEMPLATE_ROWS,
  readImportFile,
  type ParsedImport,
} from "@/lib/importUsers";
import type { ClassSummary, CourseSummary, ImportRowResult, ImportUsersResult } from "@/lib/types";
import { useToast } from "@/store/toast";

type Step = "pick" | "running" | "done";

const STATUS_LABEL: Record<ImportRowResult["status"], { text: string; cls: string }> = {
  CREATED: { text: "Đã tạo", cls: "bg-green-soft text-green" },
  EXISTING: { text: "Đã có sẵn", cls: "bg-soft text-muted" },
  ERROR: { text: "Lỗi", cls: "bg-red-soft text-red" },
};

/**
 * Nhập tài khoản hàng loạt từ file Excel (.xlsx) hoặc CSV. File chỉ cần Họ tên + Email (+ Tên đăng nhập nếu
 * muốn) — KHÔNG có mật khẩu: hệ thống tự sinh mật khẩu ngẫu nhiên cho từng tài khoản mới và chỉ hiện đúng 1
 * lần ở màn kết quả, nên có nút tải danh sách về. Có thể thêm luôn vào một lớp và/hoặc ghi danh vào một khóa.
 */
export function ImportUsersDialog({
  token,
  canAssign,
  onClose,
  onDone,
}: {
  token: string;
  /** Có quyền enrollment:manage nên được chọn lớp / khóa để gắn luôn. */
  canAssign: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [classId, setClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [courseId, setCourseId] = useState("");

  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportUsersResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAssign) return;
    classApi.list(token).then(setClasses).catch(() => {});
    catalogAdminApi
      .courses(token)
      .then((list) => setCourses(list.filter((c) => c.status === "PUBLISHED")))
      .catch(() => {});
  }, [token, canAssign]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setReadError(null);
    setParsed(null);
    setFileName(file.name);
    try {
      const p = await readImportFile(file);
      if (p.rows.length === 0) setReadError("File không có dòng dữ liệu nào.");
      setParsed(p);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Không đọc được file");
    }
  }

  function downloadTemplate() {
    downloadCsvTable("mau-nhap-tai-khoan.csv", IMPORT_TEMPLATE_HEADER, IMPORT_TEMPLATE_ROWS);
  }

  const creatingClass = classId === "new";
  const rowCount = parsed?.rows.length ?? 0;
  const canRun = rowCount > 0 && step === "pick" && (!creatingClass || newClassName.trim().length > 0);

  async function run() {
    if (!parsed || rowCount === 0) return;
    setStep("running");
    setRunError(null);
    const merged: ImportUsersResult = {
      created: 0,
      existing: 0,
      errors: 0,
      addedToClass: 0,
      newlyEnrolled: 0,
      rows: [],
    };
    setProgress({ done: 0, total: rowCount });
    try {
      let targetClassId: number | undefined;
      if (canAssign && creatingClass) {
        targetClassId = (await classApi.create(token, { name: newClassName.trim() })).id;
      } else if (canAssign && classId) {
        targetClassId = Number(classId);
      }
      const targetCourseId = canAssign && courseId ? Number(courseId) : undefined;

      for (let start = 0; start < rowCount; start += IMPORT_CHUNK_SIZE) {
        const chunk = parsed.rows.slice(start, start + IMPORT_CHUNK_SIZE);
        const r = await adminUserApi.importFile(token, {
          rows: chunk,
          classId: targetClassId,
          courseId: targetCourseId,
        });
        merged.created += r.created;
        merged.existing += r.existing;
        merged.errors += r.errors;
        merged.addedToClass += r.addedToClass;
        merged.newlyEnrolled += r.newlyEnrolled;
        // Số dòng backend tính từ 1 trong từng lượt; cộng bù để khớp số thứ tự dòng dữ liệu trong file.
        merged.rows.push(...r.rows.map((row) => ({ ...row, line: row.line + start })));
        setResult({ ...merged, rows: [...merged.rows] });
        setProgress({ done: Math.min(start + IMPORT_CHUNK_SIZE, rowCount), total: rowCount });
      }
      toast.success(`Đã tạo ${merged.created} tài khoản mới`);
      onDone();
    } catch (err) {
      setRunError(err instanceof ApiError ? err.message : "Nhập tài khoản thất bại");
      if (merged.rows.length > 0) onDone();
    } finally {
      setResult({ ...merged, rows: [...merged.rows] });
      setStep("done");
    }
  }

  function downloadReport() {
    if (!result) return;
    downloadCsvTable(
      "ket-qua-nhap-tai-khoan.csv",
      ["Dòng", "Họ tên", "Email", "Tên đăng nhập", "Mật khẩu", "Kết quả", "Ghi chú"],
      result.rows.map((r) => [
        r.line,
        r.fullName,
        r.email,
        r.username,
        r.password,
        STATUS_LABEL[r.status].text,
        r.message,
      ]),
    );
  }

  const created = result?.rows.filter((r) => r.status === "CREATED") ?? [];
  const problems = result?.rows.filter((r) => r.status === "ERROR") ?? [];

  return (
    <Dialog title="Nhập tài khoản từ file Excel" onClose={onClose} widthClass="max-w-3xl">
      {step === "pick" && (
        <div className="space-y-5">
          <div className="rounded-lg bg-soft p-4 text-sm">
            <p className="font-medium">File gồm các cột:</p>
            <ul className="mt-1 list-inside list-disc text-muted">
              <li>
                <b className="text-text">Họ tên</b> và <b className="text-text">Email</b> (bắt buộc)
              </li>
              <li>
                <b className="text-text">Tên đăng nhập</b> (không bắt buộc — để trống thì lấy từ phần trước @ của email)
              </li>
            </ul>
            <p className="mt-2 text-muted">
              Không cần cột mật khẩu: hệ thống tự tạo mật khẩu ngẫu nhiên cho từng tài khoản mới và hiện ở bước sau.
              Mỗi lần nhập được nhiều dòng; file lớn sẽ tự chia thành nhiều lượt.
            </p>
            <button type="button" onClick={downloadTemplate} className="mt-2 text-sm font-semibold text-accent hover:underline">
              Tải file mẫu (CSV)
            </button>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.txt"
              onChange={(e) => onPickFile(e.target.files?.[0])}
              data-testid="import-file-input"
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-fill file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              aria-label="Chọn file Excel hoặc CSV"
            />
            {readError && <p className="mt-2 text-sm text-red">{readError}</p>}
          </div>

          {parsed && rowCount > 0 && (
            <div data-testid="import-preview">
              <p className="mb-2 text-sm">
                <b>{fileName}</b>: đọc được <b>{rowCount}</b> dòng
                {parsed.headerDetected ? " (đã nhận dòng tiêu đề)" : " (không có dòng tiêu đề, hiểu theo thứ tự Họ tên, Email, Tên đăng nhập)"}.
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-soft text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Họ tên</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Tên đăng nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1.5 text-muted">{i + 1}</td>
                        <td className="px-3 py-1.5">{r.fullName || <span className="text-red">thiếu</span>}</td>
                        <td className="px-3 py-1.5">{r.email || <span className="text-red">thiếu</span>}</td>
                        <td className="px-3 py-1.5 text-muted">{r.username ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rowCount > 8 && <p className="mt-1 text-xs text-muted">… và {rowCount - 8} dòng nữa.</p>}
            </div>
          )}

          {canAssign && rowCount > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="import-class">
                  Thêm vào lớp (không bắt buộc)
                </label>
                <select id="import-class" value={classId} onChange={(e) => setClassId(e.target.value)} className="input w-full text-sm">
                  <option value="">— Không thêm vào lớp —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="new">+ Tạo lớp mới…</option>
                </select>
                {creatingClass && (
                  <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    maxLength={150}
                    placeholder="Tên lớp mới"
                    className="input w-full text-sm"
                    aria-label="Tên lớp mới"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="import-course">
                  Ghi danh vào khóa học (không bắt buộc)
                </label>
                <select id="import-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input w-full text-sm">
                  <option value="">— Không ghi danh —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted sm:col-span-2">
                Tài khoản đã có sẵn (trùng email) không bị tạo lại nhưng vẫn được thêm vào lớp / khóa bạn chọn.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-text">
              Hủy
            </button>
            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="rounded-lg bg-primary-fill px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {rowCount > 0 ? `Nhập ${rowCount} dòng` : "Nhập tài khoản"}
            </button>
          </div>
        </div>
      )}

      {step === "running" && (
        <div className="py-8 text-center" aria-live="polite">
          <p className="font-medium">Đang tạo tài khoản…</p>
          <p className="mt-1 text-sm text-muted">
            {progress.done}/{progress.total} dòng. Vui lòng không đóng cửa sổ này.
          </p>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4" data-testid="import-result">
          {runError && (
            <div className="rounded-lg border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">
              {runError}
              {result.rows.length > 0 && " Các dòng đã xử lý trước đó vẫn được giữ lại, xem bên dưới."}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-green-soft px-3 py-1 font-semibold text-green">{result.created} tài khoản mới</span>
            {result.existing > 0 && (
              <span className="rounded-full bg-soft px-3 py-1 font-semibold text-muted">{result.existing} đã có sẵn</span>
            )}
            {result.errors > 0 && (
              <span className="rounded-full bg-red-soft px-3 py-1 font-semibold text-red">{result.errors} dòng lỗi</span>
            )}
            {result.addedToClass > 0 && (
              <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{result.addedToClass} vào lớp</span>
            )}
            {result.newlyEnrolled > 0 && (
              <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">
                {result.newlyEnrolled} lượt ghi danh khóa học
              </span>
            )}
          </div>

          {created.length > 0 && (
            <div className="rounded-lg border border-accent/40 bg-accent-soft p-4 text-sm">
              <p className="font-semibold">Mật khẩu chỉ hiện một lần ở đây.</p>
              <p className="mt-1 text-muted">
                Hãy tải danh sách tài khoản về và gửi cho từng học viên. Sau khi đóng cửa sổ này sẽ không xem lại được mật khẩu
                (chỉ có thể đặt lại mật khẩu mới).
              </p>
              <button
                type="button"
                onClick={downloadReport}
                className="mt-3 rounded-lg bg-primary-fill px-4 py-2 text-sm font-semibold text-white"
              >
                Tải danh sách tài khoản (CSV)
              </button>
            </div>
          )}

          {result.rows.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-soft text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Dòng</th>
                    <th className="px-3 py-2 font-medium">Họ tên / Email</th>
                    <th className="px-3 py-2 font-medium">Tên đăng nhập</th>
                    <th className="px-3 py-2 font-medium">Mật khẩu</th>
                    <th className="px-3 py-2 font-medium">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const st = STATUS_LABEL[r.status];
                    return (
                      <tr key={r.line} className="border-t border-border align-top">
                        <td className="px-3 py-1.5 text-muted">{r.line}</td>
                        <td className="px-3 py-1.5">
                          {r.fullName || "—"}
                          <p className="text-xs text-muted">{r.email || "—"}</p>
                        </td>
                        <td className="px-3 py-1.5">{r.username ?? "—"}</td>
                        <td className="px-3 py-1.5 font-mono">{r.password ?? "—"}</td>
                        <td className="px-3 py-1.5">
                          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.text}</span>
                          {r.message && <p className="mt-0.5 text-xs text-muted">{r.message}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {problems.length > 0 && (
            <p className="text-xs text-muted">Sửa các dòng lỗi trong file rồi nhập lại — dòng đã tạo sẽ được bỏ qua vì email đã tồn tại.</p>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-5 py-2 text-sm font-semibold hover:bg-soft">
              Đóng
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
