import type { GradebookRow } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  GRADED: { label: "Đã chấm", cls: "bg-green-soft text-green" },
  SUBMITTED: { label: "Chờ chấm", cls: "bg-accent-soft text-accent" },
  IN_PROGRESS: { label: "Đang làm", cls: "bg-primary-soft text-primary" },
  EXPIRED: { label: "Hết giờ", cls: "bg-red-soft text-red" },
};

export function GradebookTable({ rows, emptyLabel }: { rows: GradebookRow[]; emptyLabel: string }) {
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.SUBMITTED;
                return (
                  <tr key={r.quizId} className="border-t border-border">
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
