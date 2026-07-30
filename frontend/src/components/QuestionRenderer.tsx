"use client";

import { DragDropImageBoard } from "@/components/DragDropImageBoard";
import { HtmlWithBlanks } from "@/components/HtmlWithBlanks";
import { KidsDragDropSentence } from "@/components/kids/KidsDragDropSentence";
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
      const singleAnswer = Boolean(
        (question.settings as { singleAnswer?: boolean } | null)?.singleAnswer,
      );
      const selected: number[] = answer?.selectedOptionIds ?? [];
      return (
        <div className="space-y-2">
          {question.options.map((o) => {
            const checked = selected.includes(o.id);
            return (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type={singleAnswer ? "radio" : "checkbox"}
                  name={singleAnswer ? `q${question.quizQuestionId}-single` : undefined}
                  checked={checked}
                  onChange={() =>
                    onChange({
                      selectedOptionIds: singleAnswer
                        ? [o.id]
                        : checked
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
                  <option key={r.value} value={r.value}>
                    {r.value}
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
      const template: string =
        (question.settings as { template?: string } | null)?.template ?? "";
      return (
        <KidsDragDropSentence
          template={template}
          dragItems={question.dragItems}
          answer={answer}
          onChange={onChange}
        />
      );
    }

    case "DRAG_DROP_MARKER": {
      const bgUrl = (question.settings as { backgroundImageUrl?: string } | null)
        ?.backgroundImageUrl;
      return (
        <DragDropImageBoard
          backgroundImageUrl={bgUrl ?? null}
          dragItems={question.dragItems}
          dragZones={question.dragZones}
          answer={answer}
          onChange={onChange}
        />
      );
    }

    case "GRID_MATCHING": {
      const choices: Record<string, string> = answer?.choices ?? {};
      return (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="bg-soft">
                <th className="border-b border-border p-3 text-left font-semibold text-text" />
                {question.gridColumns.map((c) => (
                  <th
                    key={c.label}
                    className="min-w-14 border-b border-l border-border p-3 text-center font-semibold text-text"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.gridRows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 1 ? "bg-soft/40" : undefined}>
                  <td className="border-b border-border p-3 font-medium">{row.rowText}</td>
                  {question.gridColumns.map((c) => {
                    const checked = choices[String(row.id)] === c.label;
                    return (
                      <td key={c.label} className="border-b border-l border-border p-0 text-center">
                        <label className="flex h-full w-full cursor-pointer items-center justify-center p-3 hover:bg-primary-soft">
                          <input
                            type="radio"
                            className="h-4 w-4 accent-current"
                            name={`grid-${question.quizQuestionId}-${row.id}`}
                            checked={checked}
                            onChange={() =>
                              onChange({ choices: { ...choices, [String(row.id)]: c.label } })
                            }
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return null;
  }
}
