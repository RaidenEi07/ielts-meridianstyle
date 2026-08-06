import { TYPE_META } from "@/lib/questionTypes";
import type { TypeBreakdown } from "@/lib/types";

// 8 màu categorical đã kiểm định an toàn cho mù màu, thứ tự CỐ ĐỊNH — xem
// --series-1..8 trong globals.css. Quá 6 lát sẽ gộp phần còn lại vào "Khác"
// (biểu đồ tròn khó phân biệt quá ~6-7 lát cạnh nhau).
const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];
const MAX_SLICES = 6;
const OTHER_KEY = "__OTHER__";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Cạnh quạt tròn từ startAngle -> endAngle (độ, 0 = 12h, thuận chiều kim
 * đồng hồ). Không vẽ được 1 lát tròn đủ 360° bằng 1 arc path (điểm đầu/cuối
 * trùng nhau) — trường hợp đó dùng <circle> riêng, xem bên dưới. */
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function WrongTypesSummary({ rows }: { rows: TypeBreakdown[] }) {
  const withWrong = rows.filter((r) => r.wrongCount > 0);

  if (withWrong.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Phân tích theo dạng câu hỏi</h2>
        <p className="mt-1 text-sm text-muted">
          Chưa có dữ liệu — học sinh chưa có lượt làm bài đã chấm nào bị sai.
        </p>
      </div>
    );
  }

  const sorted = [...withWrong].sort((a, b) => b.wrongCount - a.wrongCount);
  const head = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const restWrong = rest.reduce((s, r) => s + r.wrongCount, 0);
  const restCorrect = rest.reduce((s, r) => s + r.correctCount, 0);
  const slices =
    restWrong > 0 ? [...head, { type: OTHER_KEY, wrongCount: restWrong, correctCount: restCorrect }] : head;

  const totalWrong = slices.reduce((s, r) => s + r.wrongCount, 0);
  let cursor = 0;
  const arcs = slices.map((r, i) => {
    const startAngle = cursor * 360;
    cursor += r.wrongCount / totalWrong;
    const endAngle = cursor * 360;
    return { ...r, startAngle, endAngle, color: SERIES_VARS[i % SERIES_VARS.length] };
  });

  const CX = 90;
  const CY = 90;
  const R = 80;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Phân tích theo dạng câu hỏi</h2>
      <p className="mb-4 text-xs text-muted">
        Tỷ trọng câu SAI theo từng dạng câu hỏi, gộp toàn bộ lượt làm bài đã chấm của học sinh.
      </p>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <svg
          viewBox="0 0 180 180"
          className="h-44 w-44 shrink-0"
          role="img"
          aria-label="Biểu đồ tròn tỷ trọng câu sai theo dạng câu hỏi"
        >
          {arcs.length === 1 ? (
            <circle cx={CX} cy={CY} r={R} fill={arcs[0].color} stroke="var(--surface)" strokeWidth={2}>
              <title>
                {(arcs[0].type === OTHER_KEY ? "Khác" : (TYPE_META[arcs[0].type]?.label ?? arcs[0].type))}:{" "}
                {arcs[0].wrongCount} câu sai (100%)
              </title>
            </circle>
          ) : (
            arcs.map((a) => {
              const label = a.type === OTHER_KEY ? "Khác" : (TYPE_META[a.type]?.label ?? a.type);
              const pct = Math.round((a.wrongCount / totalWrong) * 100);
              return (
                <path
                  key={a.type}
                  d={arcPath(CX, CY, R, a.startAngle, a.endAngle)}
                  fill={a.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  <title>
                    {label}: {a.wrongCount} câu sai ({pct}%)
                  </title>
                </path>
              );
            })
          )}
        </svg>
        <ul className="grid flex-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {arcs.map((a) => {
            const label = a.type === OTHER_KEY ? "Khác" : (TYPE_META[a.type]?.label ?? a.type);
            const total = a.wrongCount + a.correctCount;
            const pct = Math.round((a.wrongCount / totalWrong) * 100);
            return (
              <li key={a.type} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: a.color }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{label}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {a.wrongCount}/{total} sai · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
