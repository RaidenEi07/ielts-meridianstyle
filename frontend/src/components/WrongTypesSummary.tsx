import { TYPE_META } from "@/lib/questionTypes";
import type { TypeBreakdown } from "@/lib/types";

export function WrongTypesSummary({ rows }: { rows: TypeBreakdown[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Phân tích theo dạng câu hỏi</h2>
      <p className="mb-3 text-xs text-muted">
        Gộp toàn bộ lượt làm bài đã chấm của học sinh, sắp theo dạng hay sai nhất lên đầu.
      </p>
      <ul className="space-y-2">
        {rows.map((r) => {
          const meta = TYPE_META[r.type];
          const total = r.correctCount + r.wrongCount;
          const wrongPct = total > 0 ? Math.round((r.wrongCount / total) * 100) : 0;
          return (
            <li key={r.type} className="flex items-center gap-3 text-sm">
              <span
                className={`w-40 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-semibold ${
                  meta?.cls ?? "bg-soft text-muted"
                }`}
              >
                {meta?.label ?? r.type}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full bg-red" style={{ width: `${wrongPct}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-xs text-muted">
                {r.wrongCount} sai / {total} tổng
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
