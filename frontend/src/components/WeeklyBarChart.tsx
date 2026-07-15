export function WeeklyBarChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 520;
  const H = 160;
  const pad = 28;
  const n = Math.max(1, data.length);
  const groupW = (W - pad * 2) / n;
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const chartH = H - pad - 20;
  const baseY = H - 20;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((d, i) => {
        const x = pad + i * groupW;
        const barH = (d.value / maxVal) * chartH;
        const bw = groupW / 2;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={x + groupW / 2 - bw / 2}
              y={baseY - barH}
              width={bw}
              height={barH}
              rx={2}
              fill="var(--primary)"
            />
            <text x={x + groupW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
