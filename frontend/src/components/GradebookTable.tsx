"use client";

import { ChevronDown, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { gradingAdminApi } from "@/lib/api";
import { TYPE_META } from "@/lib/questionTypes";
import type { AnswerGradingDto, GradebookRow } from "@/lib/types";

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

function AttemptDetailModal({
  attemptId,
  token,
  onClose,
}: {
  attemptId: number;
  token: string;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<AnswerGradingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gradingAdminApi
      .answersForGrading(token, attemptId)
      .then(setAnswers)
      .catch(() => setError("Không tải được chi tiết lượt làm bài"));
  }, [token, attemptId]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Chi tiết lượt làm bài</h3>
          <button type="button" onClick={onClose} className="text-faint hover:text-text">
            <X className="h-5 w-5" />
          </button>
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
                  key={a.answerId}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.correct === true
                        ? "bg-green-soft text-green"
                        : a.correct === false
                          ? "bg-red-soft text-red"
                          : "bg-soft text-muted"
                    }`}
                  >
                    {a.correct === true ? "✓ Đúng" : a.correct === false ? "✗ Sai" : "Chưa chấm"}
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
}: {
  rows: GradebookRow[];
  emptyLabel: string;
  token?: string;
}) {
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [viewingAttemptId, setViewingAttemptId] = useState<number | null>(null);

  const bands = rows.map((r) => r.bandScore).filter((b): b is number => b != null);
  const bestBand = bands.length ? Math.max(...bands) : null;
  const totalRaw = rows.reduce((s, r) => s + (r.bestScore ?? 0), 0);
  const totalMax = rows.reduce((s, r) => s + (r.maxScore ?? 0), 0);
  const pct = totalMax > 0 ? Math.round((totalRaw / totalMax) * 100) : 0;

  return (
    <div className="space-y-6">
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
              <th className="px-4 py-2.5 text-center font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
              <th className="px-4 py-2.5 text-right font-medium">Band</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
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
                      onClick={() => token && setExpandedQuiz(isExpanded ? null : r.quizId)}
                    >
                      <td className="px-2 py-3 text-center">
                        {token && r.attemptList.length > 0 && (
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
                    {token && isExpanded && (
                      <tr className="border-t border-border bg-bg">
                        <td colSpan={7} className="px-4 py-3">
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
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingAttemptId(a.attemptId);
                                  }}
                                  className="ml-auto font-semibold text-accent hover:underline"
                                >
                                  Xem chi tiết →
                                </button>
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

      {token && viewingAttemptId !== null && (
        <AttemptDetailModal
          attemptId={viewingAttemptId}
          token={token}
          onClose={() => setViewingAttemptId(null)}
        />
      )}
    </div>
  );
}
