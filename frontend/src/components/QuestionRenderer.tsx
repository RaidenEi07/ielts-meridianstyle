"use client";

import { HtmlWithBlanks } from "@/components/HtmlWithBlanks";
import type { PlayerQuestion } from "@/lib/types";

/**
 * Render phần trả lời (không kèm khung thẻ/số thứ tự/cờ đánh dấu) cho 1 câu hỏi,
 * dùng chung giữa màn hình làm bài thật (quiz/[attemptId]) và màn hình xem trước
 * (teacher/questions). Nhận PlayerQuestion đã lọc đáp án — không bao giờ nhận
 * QuestionDetail (bản đầy đủ) trực tiếp.
 */
export function QuestionRenderer({
  question,
  answer,
  onChange,
  blankOrder,
}: {
  question: PlayerQuestion;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (response: any) => void;
  blankOrder?: Map<string, number>;
}) {
  switch (question.type) {
    case "MULTIPLE_CHOICE": {
      const selected: number[] = answer?.selectedOptionIds ?? [];
      return (
        <div className="space-y-2">
          {question.options.map((o) => {
            const checked = selected.includes(o.id);
            return (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      selectedOptionIds: checked
                        ? selected.filter((x) => x !== o.id)
                        : [...selected, o.id],
                    })
                  }
                />
                {o.content}
              </label>
            );
          })}
        </div>
      );
    }

    case "TRUE_FALSE_NOT_GIVEN":
      return (
        <div className="flex flex-wrap gap-2">
          {question.options.map((o) => {
            const active = answer?.selectedOptionId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange({ selectedOptionId: o.id })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {o.content}
              </button>
            );
          })}
        </div>
      );

    case "SHORT_ANSWER":
      return (
        <input
          type="text"
          value={answer?.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Nhập câu trả lời…"
          className="w-full max-w-sm border-b-2 border-primary/40 bg-transparent px-1 py-1.5 outline-none focus:border-primary"
        />
      );

    case "MATCHING": {
      const matches: Record<string, string> = answer?.matches ?? {};
      return (
        <div className="space-y-2">
          {question.matchingPairs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 font-medium">{p.leftItem}</span>
              <span className="text-muted">↔</span>
              <select
                value={matches[String(p.id)] ?? ""}
                onChange={(e) =>
                  onChange({ matches: { ...matches, [String(p.id)]: e.target.value } })
                }
                className="input flex-1 text-sm"
              >
                <option value="">— Chọn —</option>
                {question.matchingRightPool.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case "CLOZE": {
      const subs: Record<string, string> = answer?.subs ?? {};
      const stem = question.stem ?? question.name;
      return (
        <HtmlWithBlanks
          html={stem}
          markerPattern={/\{(\d+)\}/g}
          className="prose prose-sm dark:prose-invert max-w-none leading-8"
          renderBlank={(subIndex) => {
            const sub = question.clozeSubAnswers.find((c) => String(c.subIndex) === subIndex);
            if (!sub) return null;
            const blankId = `blank-${question.quizQuestionId}-${subIndex}`;
            const num = blankOrder?.get(`${question.quizQuestionId}:${subIndex}`);
            const badge = num != null ? (
              <span className="mr-1 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                {num}
              </span>
            ) : null;
            if (sub.subType === "SELECT") {
              const opts: string[] = Array.isArray(sub.options) ? sub.options : [];
              return (
                <span className="mx-1 inline-flex items-center">
                  {badge}
                  <select
                    id={blankId}
                    value={subs[subIndex] ?? ""}
                    onChange={(e) => onChange({ subs: { ...subs, [subIndex]: e.target.value } })}
                    className="input inline-block w-auto text-sm"
                  >
                    <option value="">—</option>
                    {opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </span>
              );
            }
            return (
              <span className="mx-1 inline-flex items-center">
                {badge}
                <input
                  id={blankId}
                  type="text"
                  value={subs[subIndex] ?? ""}
                  onChange={(e) => onChange({ subs: { ...subs, [subIndex]: e.target.value } })}
                  className="inline-block w-28 border-0 border-b-2 bg-transparent px-1 text-center outline-none"
                  style={{ borderColor: subs[subIndex] ? "var(--primary)" : "var(--border)" }}
                />
              </span>
            );
          }}
        />
      );
    }

    case "DRAG_DROP_TEXT": {
      const placements: Record<string, string> = answer?.placements ?? {};
      const template: string =
        (question.settings as { template?: string } | null)?.template ?? "";
      const parts = template.split(/\[\[(\d+)\]\]/);
      return (
        <p className="whitespace-pre-wrap leading-8">
          {parts.map((part, i) => {
            if (i % 2 === 0) return <span key={i}>{part}</span>;
            const targetLabel = part;
            const selectedItemId = Object.keys(placements).find(
              (id) => placements[id] === targetLabel,
            );
            return (
              <select
                key={i}
                value={selectedItemId ?? ""}
                onChange={(e) => {
                  const itemId = e.target.value;
                  const next = { ...placements };
                  Object.keys(next).forEach((id) => {
                    if (next[id] === targetLabel) delete next[id];
                  });
                  if (itemId) next[itemId] = targetLabel;
                  onChange({ placements: next });
                }}
                className="input mx-1 inline-block w-auto text-sm"
              >
                <option value="">—</option>
                {question.dragItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.content}
                  </option>
                ))}
              </select>
            );
          })}
        </p>
      );
    }

    case "DRAG_DROP_MARKER": {
      const placements: Record<string, string> = answer?.placements ?? {};
      const bgUrl = (question.settings as { backgroundImageUrl?: string } | null)
        ?.backgroundImageUrl;
      return (
        <div className="space-y-3">
          {bgUrl && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgUrl} alt="" className="max-w-full rounded-lg border border-border" />
              {question.dragZones.map((z) => (
                <div
                  key={z.id}
                  className="absolute flex items-center justify-center rounded border-2 border-dashed border-accent bg-accent-soft/60 text-xs font-semibold text-accent"
                  style={{ left: z.x, top: z.y, width: z.width, height: z.height }}
                >
                  {z.label}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {question.dragItems.map((it) => (
              <div key={it.id} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 font-medium">{it.content}</span>
                <span className="text-muted">→</span>
                <select
                  value={placements[String(it.id)] ?? ""}
                  onChange={(e) =>
                    onChange({ placements: { ...placements, [String(it.id)]: e.target.value } })
                  }
                  className="input flex-1 text-sm"
                >
                  <option value="">— Chọn vùng —</option>
                  {question.dragZones.map((z) => (
                    <option key={z.id} value={z.label}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
