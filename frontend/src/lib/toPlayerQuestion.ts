import type { PlayerQuestion, QuestionDetail } from "./types";

/**
 * Chuyển QuestionDetail (đầy đủ, có đáp án — dùng cho form soạn câu hỏi) sang
 * PlayerQuestion (đã lọc đáp án — dùng cho màn hình làm bài/xem trước), áp
 * dụng đúng quy tắc lọc mà backend AttemptService.playerView() dùng, để "Xem
 * trước" trung thực với những gì học viên thực sự thấy.
 */
export function toPlayerQuestion(q: QuestionDetail): PlayerQuestion {
  const base: PlayerQuestion = {
    quizQuestionId: q.id,
    questionId: q.id,
    type: q.type,
    name: q.name,
    stem: q.stem,
    mark: q.defaultMark,
    pageId: null,
    settings: null,
    options: [],
    matchingPairs: [],
    matchingRightPool: [],
    dragItems: [],
    dragZones: [],
    clozeSubAnswers: [],
    audience: q.audience,
  };

  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE_NOT_GIVEN":
      base.options = q.options.map((o) => ({ id: o.id ?? 0, content: o.content }));
      break;
    case "MATCHING": {
      base.matchingPairs = q.matchingPairs.map((p) => ({
        id: p.id ?? 0,
        leftItem: p.leftItem,
        leftImageUrl: p.leftImageUrl ?? null,
      }));
      const pool = q.matchingPairs.map((p) => ({
        value: p.rightItem,
        imageUrl: p.rightImageUrl ?? null,
      }));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      base.matchingRightPool = pool;
      break;
    }
    case "DRAG_DROP_TEXT":
    case "DRAG_DROP_MARKER":
      base.dragItems = q.dragItems.map((d) => ({ id: d.id ?? 0, content: d.content }));
      base.dragZones = q.dragZones.map((z) => ({
        id: z.id ?? 0,
        label: z.label,
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
      }));
      base.settings = q.settings;
      break;
    case "CLOZE":
      base.clozeSubAnswers = q.clozeSubAnswers.map((c) => ({
        id: c.id ?? 0,
        subIndex: c.subIndex,
        subType: c.subType,
        options: c.options,
      }));
      break;
    default:
      break;
  }

  return base;
}
