"use client";

import { DragDropImageBoard } from "@/components/DragDropImageBoard";
import { DragDropSentence } from "@/components/DragDropSentence";
import { HtmlWithBlanks } from "@/components/HtmlWithBlanks";
import { isTfngOptionSet } from "@/lib/tfngOptionSet";
import type { GradedItem, PlayerQuestion } from "@/lib/types";

/** Màu viền/nền cho 1 lựa chọn MC/TFNG lúc xem lại — đáp án đúng luôn hiện
 * xanh (dù học sinh có chọn hay không, để biết lẽ ra phải chọn gì), lựa chọn
 * học sinh chọn SAI thì hiện đỏ, còn lại giữ màu trung tính mặc định. */
export function optionReviewClass(review: GradedItem | undefined, optionId: number, selected: boolean): string | null {
  if (!review || review.correctOptionIds.length === 0) return null;
  const isCorrect = review.correctOptionIds.includes(optionId);
  if (isCorrect) return "border-green bg-green-soft text-green";
  if (selected) return "border-red bg-red-soft text-red";
  return null;
}

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
  review,
}: {
  question: PlayerQuestion;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (response: any) => void;
  blankOrder?: Map<string, number>;
  /** Có giá trị = đang xem lại SAU khi nộp bài — tô màu ngay tại vị trí từng
   * lựa chọn MC/TFNG (xanh = đáp án đúng, đỏ = học sinh chọn sai). */
  review?: GradedItem;
}) {
  switch (question.type) {
    case "MULTIPLE_CHOICE": {
      // Nội dung di chuyển từ Moodle thường lưu Yes/No/Not-Given (hay
      // True/False/Not-Given) dưới dạng MULTIPLE_CHOICE thường, không có
      // settings.singleAnswer — nhưng bản chất luôn chỉ chọn được 1 đáp án,
      // ép về radio bất kể settings để không cho tick nhiều đáp án cùng lúc.
      const looksLikeTfng = isTfngOptionSet(question.options.map((o) => o.content));
      const singleAnswer =
        looksLikeTfng || Boolean((question.settings as { singleAnswer?: boolean } | null)?.singleAnswer);
      const selected: number[] = answer?.selectedOptionIds ?? [];

      if (looksLikeTfng) {
        // Vẫn là type MULTIPLE_CHOICE thật trong dữ liệu (payload gửi lên
        // giữ nguyên selectedOptionIds — không đổi được sang shape của
        // TRUE_FALSE_NOT_GIVEN thật vì backend chấm điểm MULTIPLE_CHOICE
        // luôn đọc đúng field này), NHƯNG hiện đúng dạng nút tròn riêng biệt
        // giống TRUE_FALSE_NOT_GIVEN thật ở case bên dưới — trước đây hiện
        // radio+nhãn như MC thường, nhìn không phân biệt được với MC thật.
        return (
          <div className="flex flex-wrap gap-2">
            {question.options.map((o) => {
              const checked = selected.includes(o.id);
              const reviewCls = optionReviewClass(review, o.id, checked);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange({ selectedOptionIds: [o.id] })}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    reviewCls
                      ?? (checked
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted hover:text-text")
                  }`}
                >
                  {o.content}
                </button>
              );
            })}
          </div>
        );
      }

      // "Choose TWO letters" kiểu câu hỏi — correctAnswerCount là SỐ LƯỢNG đáp
      // án đúng (không lộ đáp án nào), tính sẵn ở backend, dùng để chặn học
      // sinh tick quá số ô đề bài cho phép — trước đây checkbox không giới
      // hạn gì, tick được cả 5/5 dù đề chỉ hỏi "chọn HAI".
      const maxSelect = !singleAnswer && (question.correctAnswerCount ?? 0) > 1
        ? question.correctAnswerCount
        : null;
      return (
        <div className="space-y-2">
          {question.options.map((o) => {
            const checked = selected.includes(o.id);
            const reviewCls = optionReviewClass(review, o.id, checked);
            const limitReached = !checked && maxSelect != null && selected.length >= maxSelect;
            return (
              // text-text tường minh — nếu không, label không có class màu
              // chữ nào sẽ THỪA KẾ màu đã tính sẵn của <body> (nằm ngoài
              // .exam-mode), bỏ qua luôn việc exam-mode ép chữ về đen tuyệt
              // đối lúc đang thi, ra màu be nhạt gần như không đọc được.
              <label key={o.id}
                title={limitReached ? `Chỉ được chọn tối đa ${maxSelect}` : undefined}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm text-text transition-colors ${
                  limitReached ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } ${reviewCls ?? "border-transparent"}`}>
                <input
                  type={singleAnswer ? "radio" : "checkbox"}
                  name={singleAnswer ? `q${question.quizQuestionId}-single` : undefined}
                  checked={checked}
                  disabled={limitReached}
                  onChange={() => {
                    if (limitReached) return;
                    onChange({
                      selectedOptionIds: singleAnswer
                        ? [o.id]
                        : checked
                          ? selected.filter((x) => x !== o.id)
                          : [...selected, o.id],
                    });
                  }}
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
            const reviewCls = optionReviewClass(review, o.id, active);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange({ selectedOptionId: o.id })}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  reviewCls
                    ?? (active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted hover:text-text")
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
          className="w-full max-w-sm border-b-2 border-primary/40 bg-transparent px-1 py-1.5 text-text outline-none focus:border-primary"
        />
      );

    case "MATCHING": {
      const matches: Record<string, string> = answer?.matches ?? {};
      return (
        <div className="space-y-2">
          {question.matchingPairs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 font-medium text-text">{p.leftItem}</span>
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
            // Xem lại sau khi nộp: trước đây mỗi ô trống chỉ đổi màu viền theo
            // "có gõ gì chưa" (var(--primary)/var(--border)) — học sinh phải tự
            // đối chiếu bằng mắt với khối "Đáp án đúng" liệt kê text tách rời
            // bên dưới mới biết ô nào đúng/sai. Giờ tô thẳng tại từng ô: xanh
            // = đúng, đỏ = sai, giống cách MC/TFNG đã tô ngay tại lựa chọn.
            const subReview = review?.clozeSubCorrect?.[subIndex];
            const reviewColor =
              subReview === true ? "var(--green)" : subReview === false ? "var(--red)" : null;
            const reviewTextClass = subReview === true ? "text-green" : subReview === false ? "text-red" : "";
            if (sub.subType === "SELECT") {
              const opts: string[] = Array.isArray(sub.options) ? sub.options : [];
              return (
                <span className="mx-1 inline-flex items-center">
                  {badge}
                  <select
                    id={blankId}
                    value={subs[subIndex] ?? ""}
                    onChange={(e) => onChange({ subs: { ...subs, [subIndex]: e.target.value } })}
                    className={`input inline-block w-auto text-sm ${reviewTextClass}`}
                    style={reviewColor ? { borderColor: reviewColor } : undefined}
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
                  className={`inline-block w-28 border-0 border-b-2 bg-transparent px-1 text-center font-semibold outline-none ${reviewTextClass || "text-text"}`}
                  style={{ borderColor: reviewColor ?? (subs[subIndex] ? "var(--primary)" : "var(--border)") }}
                />
              </span>
            );
          }}
        />
      );
    }

    case "DRAG_DROP_TEXT": {
      const dragDropSettings = question.settings as
        | { template?: string; templateHeading?: string; bankHeading?: string }
        | null;
      const template: string = dragDropSettings?.template ?? "";
      // Câu hỏi đứng riêng (không nhúng vào đoạn văn — dạng đó render thẳng
      // trong ReadingSplitPane bằng dropdown, không qua đây) luôn kéo-thả
      // thật, mọi audience — khớp IELTS CD thật cho Sentence/Summary
      // Completion (kéo từ khối từ vào chỗ trống), không phải dropdown.
      return (
        <DragDropSentence
          template={template}
          templateHeading={dragDropSettings?.templateHeading}
          bankHeading={dragDropSettings?.bankHeading}
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
                  <td className="border-b border-border p-3 font-medium text-text">{row.rowText}</td>
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
