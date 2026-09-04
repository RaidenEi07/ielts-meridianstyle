"use client";

import { ChevronDown, Download, FileDown, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { ApiError, gradingAdminApi } from "@/lib/api";
import { downloadAttemptPdf, downloadGradebookCsv } from "@/lib/export";
import { TYPE_META } from "@/lib/questionTypes";
import { useToast } from "@/store/toast";
import type { AnswerGradingDto, AttemptSummary, GradebookRow } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  GRADED: { label: "Đã chấm", cls: "bg-green-soft text-green" },
  SUBMITTED: { label: "Chờ chấm", cls: "bg-accent-soft text-accent" },
  IN_PROGRESS: { label: "Đang làm", cls: "bg-primary-soft text-primary" },
  EXPIRED: { label: "Hết giờ", cls: "bg-red-soft text-red" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

/** answer.response của câu Tự luận lưu dạng {"text": "..."} (khớp payload
 * WritingEditor gửi lên khi làm bài) — không phải chuỗi thô. Parse ra đúng
 * nội dung học viên viết; nếu vì lý do gì đó không đúng dạng JSON này thì vẫn
 * hiện được nguyên văn thay vì hiện lỗi hoặc mất trắng. */
function essayText(response: string | null): string {
  if (!response) return "";
  try {
    const parsed: unknown = JSON.parse(response);
    if (parsed && typeof parsed === "object" && "text" in parsed) {
      const t = (parsed as { text: unknown }).text;
      if (typeof t === "string") return t;
    }
  } catch {
    // không phải JSON — coi như chuỗi thô, hiện nguyên văn bên dưới.
  }
  return response;
}

/** Form chấm tay 1 câu Tự luận. API chấm tay (PATCH .../answers/{id}/grade) đã
 * có sẵn ở backend từ trước — kèm cả lưu lịch sử ai chấm lúc nào — chỉ là chưa
 * từng có giao diện nào gọi tới, nên trước đây màn này chỉ HIỆN được trạng
 * thái "Chưa chấm" chứ không chấm được. */
function ManualGradeForm({
  token,
  attemptId,
  answer,
  onGraded,
}: {
  token: string;
  attemptId: number;
  answer: AnswerGradingDto;
  onGraded: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(answer.awardedMark == null);
  const [score, setScore] = useState(answer.awardedMark != null ? String(answer.awardedMark) : "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const mark = Number(score.replace(",", "."));
    if (Number.isNaN(mark) || mark < 0 || (answer.mark != null && mark > answer.mark)) {
      toast.error(`Điểm phải trong khoảng 0..${answer.mark ?? "?"}`);
      return;
    }
    if (answer.answerId == null) return;
    setSaving(true);
    try {
      await gradingAdminApi.gradeAnswer(token, attemptId, answer.answerId, {
        awardedMark: mark,
        reason: reason.trim() || undefined,
      });
      toast.success("Đã lưu điểm.");
      setEditing(false);
      setReason("");
      onGraded();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chấm điểm thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-semibold text-accent hover:underline"
      >
        {answer.awardedMark != null ? "Sửa điểm" : "Chấm điểm"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-2">
      <input
        type="number"
        min={0}
        max={answer.mark ?? undefined}
        step={0.5}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder="Điểm"
        className="input w-20 text-sm"
      />
      <span className="text-xs text-muted">/ {answer.mark ?? "—"}</span>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Nhận xét (tùy chọn)"
        className="input min-w-[10rem] flex-1 text-sm"
      />
      <button
        type="button"
        disabled={saving || score === ""}
        onClick={save}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Đang lưu…" : "Lưu điểm"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-muted hover:text-text"
      >
        Hủy
      </button>
    </div>
  );
}

function AttemptDetailModal({
  attemptId,
  token,
  studentName,
  quizTitle,
  attempt,
  onClose,
  onGraded,
}: {
  attemptId: number;
  token: string;
  studentName: string;
  quizTitle: string;
  attempt: AttemptSummary;
  onClose: () => void;
  /** Gọi lại sau khi chấm xong 1 câu — trang cha (sổ điểm ngoài modal này)
   * đang giữ điểm/trạng thái cũ, tự refetch để không lệch với điểm vừa chấm. */
  onGraded?: () => void;
}) {
  const [answers, setAnswers] = useState<AnswerGradingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadAnswers() {
    gradingAdminApi
      .answersForGrading(token, attemptId)
      .then(setAnswers)
      .catch(() => setError("Không tải được chi tiết lượt làm bài"));
  }

  useEffect(loadAnswers, [token, attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGraded() {
    loadAnswers();
    onGraded?.();
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Chi tiết lượt làm bài</h3>
          <div className="flex items-center gap-3">
            {answers && (
              <button
                type="button"
                onClick={() =>
                  downloadAttemptPdf({
                    studentName,
                    quizTitle,
                    attemptNumber: attempt.attemptNumber,
                    submittedAt: attempt.submittedAt,
                    rawScore: attempt.rawScore,
                    maxScore: attempt.maxScore,
                    bandScore: attempt.bandScore,
                    violations: attempt.violations,
                    answers,
                  })
                }
                className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                <FileDown className="h-4 w-4" /> Xuất PDF
              </button>
            )}
            <button type="button" onClick={onClose} className="text-faint hover:text-text">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red">{error}</p>}
        {!answers && !error ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : (
          <ul className="space-y-2">
            {answers?.map((a) => {
              const meta = a.type ? TYPE_META[a.type] : undefined;
              return (
                <li
                  key={a.quizQuestionId}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        !a.answered
                          ? "bg-soft text-faint"
                          : a.correct === true
                            ? "bg-green-soft text-green"
                            : a.correct === false
                              ? "bg-red-soft text-red"
                              : "bg-soft text-muted"
                      }`}
                    >
                      {!a.answered
                        ? "— Không trả lời"
                        : a.correct === true
                          ? "✓ Đúng"
                          : a.correct === false
                            ? "✗ Sai"
                            : "Chưa chấm"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.name ?? "—"}</p>
                      {meta && (
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${meta.cls}`}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {a.awardedMark ?? "—"}/{a.mark ?? "—"}
                    </span>
                  </div>
                  {/* Essay chấm tay: cần thấy đúng bài học viên đã viết mới chấm
                      được — trước đây modal này chỉ hiện trạng thái, không hiện
                      bài làm lẫn ô nhập điểm nào cả. token có nghĩa đang ở chế độ
                      admin/giáo viên chấm (selfView không mở modal này). */}
                  {token && a.needsManualGrading && a.answered && a.answerId != null && (
                    <div className="ml-9 space-y-2 border-t border-border pt-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Bài làm của học viên</p>
                        <p className="whitespace-pre-wrap rounded-lg bg-bg p-2 text-sm">
                          {essayText(a.response).trim() ? (
                            essayText(a.response)
                          ) : (
                            <span className="text-faint">(để trống)</span>
                          )}
                        </p>
                      </div>
                      <ManualGradeForm
                        token={token}
                        attemptId={attemptId}
                        answer={a}
                        onGraded={handleGraded}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function GradebookTable({
  rows,
  emptyLabel,
  token,
  studentName,
  selfView,
  onGraded,
}: {
  rows: GradebookRow[];
  emptyLabel: string;
  token?: string;
  /** Tên học viên, chỉ cần khi có `token` — dùng để đặt tên file xuất CSV/PDF. */
  studentName?: string;
  /** true khi CHÍNH học viên đang xem điểm của mình (trang "Điểm số của tôi")
   * — vẫn cho mở rộng từng lượt như admin/giáo viên, nhưng "Xem chi tiết"
   * dẫn thẳng tới trang làm bài ở chế độ xem lại (/quiz/[attemptId], học
   * viên tự có quyền xem lượt của chính mình) thay vì gọi API chấm điểm
   * admin-only (quiz:regrade) mà học viên không có quyền. */
  selfView?: boolean;
  /** Gọi lại sau khi admin/giáo viên chấm xong 1 câu Tự luận trong modal —
   * `rows` là state của trang cha, chấm xong điểm cũ hiển thị ở bảng ngoài
   * (best score, trạng thái Đã chấm/Chờ chấm) sẽ lệch với DB nếu trang cha
   * không tự refetch lại `rows`. */
  onGraded?: () => void;
}) {
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [viewing, setViewing] = useState<{ attempt: AttemptSummary; quizTitle: string } | null>(null);
  const canExpand = Boolean(token) || Boolean(selfView);

  const bands = rows.map((r) => r.bandScore).filter((b): b is number => b != null);
  const bestBand = bands.length ? Math.max(...bands) : null;
  const totalRaw = rows.reduce((s, r) => s + (r.bestScore ?? 0), 0);
  const totalMax = rows.reduce((s, r) => s + (r.maxScore ?? 0), 0);
  const pct = totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;

  return (
    <div className="space-y-6">
      {token && rows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => downloadGradebookCsv(rows, studentName ?? "hoc-vien")}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-accent hover:bg-soft"
          >
            <Download className="h-4 w-4" /> Xuất sổ điểm (CSV)
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-primary p-5 text-white">
          <p className="text-sm text-white/70">Band cao nhất</p>
          <p className="mt-1 text-4xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {bestBand != null ? bestBand : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Tỷ lệ đúng chung</p>
          <p className="mt-1 text-4xl font-bold text-accent" style={{ fontFamily: "var(--font-serif)" }}>
            {pct}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-sm text-muted">Số bài đã làm</p>
          <p className="mt-1 text-4xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {rows.length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft text-muted">
            <tr>
              <th className="w-8 px-2 py-2.5" />
              <th className="px-4 py-2.5 font-medium">Bài</th>
              <th className="px-4 py-2.5 font-medium">Khóa học</th>
              <th className="px-4 py-2.5 text-center font-medium">Lượt</th>
              <th className="px-4 py-2.5 font-medium">Ngày giờ làm bài</th>
              <th className="px-4 py-2.5 text-center font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
              <th className="px-4 py-2.5 text-right font-medium">Band</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.SUBMITTED;
                const isExpanded = expandedQuiz === r.quizId;
                return (
                  <Fragment key={r.quizId}>
                    <tr
                      className="cursor-pointer border-t border-border hover:bg-soft/50"
                      onClick={() => canExpand && setExpandedQuiz(isExpanded ? null : r.quizId)}
                    >
                      <td className="px-2 py-3 text-center">
                        {canExpand && r.attemptList.length > 0 && (
                          <ChevronDown
                            className={`mx-auto h-4 w-4 text-muted transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.quizTitle}</td>
                      <td className="px-4 py-3 text-muted">{r.courseName}</td>
                      <td className="px-4 py-3 text-center text-muted">{r.attempts}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(r.lastSubmittedAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {r.bestScore ?? "—"}
                        <span className="text-muted">/{r.maxScore ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-accent">
                        {r.bandScore != null ? r.bandScore : "—"}
                      </td>
                    </tr>
                    {canExpand && isExpanded && (
                      <tr className="border-t border-border bg-bg">
                        <td colSpan={8} className="px-4 py-3">
                          <ul className="space-y-1.5">
                            {r.attemptList.map((a) => (
                              <li
                                key={a.attemptId}
                                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                              >
                                <span className="font-medium text-muted">Lượt {a.attemptNumber}</span>
                                <span className="text-muted">{fmtDate(a.submittedAt)}</span>
                                <span className="font-mono">
                                  {a.rawScore ?? "—"}/{a.maxScore ?? "—"}
                                  {a.bandScore != null ? ` · Band ${a.bandScore}` : ""}
                                </span>
                                {a.violations > 0 && (
                                  <span className="rounded-full bg-red-soft px-2 py-0.5 font-semibold text-red">
                                    ⚠ {a.violations} lần chuyển tab
                                  </span>
                                )}
                                {selfView ? (
                                  <Link
                                    href={`/quiz/${a.attemptId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="ml-auto font-semibold text-accent hover:underline"
                                  >
                                    Xem chi tiết →
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewing({ attempt: a, quizTitle: r.quizTitle });
                                    }}
                                    className="ml-auto font-semibold text-accent hover:underline"
                                  >
                                    Xem chi tiết →
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {token && viewing !== null && (
        <AttemptDetailModal
          attemptId={viewing.attempt.attemptId}
          token={token}
          studentName={studentName ?? "Học viên"}
          quizTitle={viewing.quizTitle}
          attempt={viewing.attempt}
          onClose={() => setViewing(null)}
          onGraded={onGraded}
        />
      )}
    </div>
  );
}
