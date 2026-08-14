"use client";

export function EssayForm({
  wordLimit,
  onWordLimitChange,
  timeLimit,
  onTimeLimitChange,
  rubric,
  onRubricChange,
}: {
  wordLimit: string;
  onWordLimitChange: (v: string) => void;
  /** Thời gian đề xuất (phút) — hiện thành dòng "You should spend about N
   * minutes on this task." trên màn hình làm bài, cùng với "Write at least
   * {wordLimit} words." — để trống thì không hiện dòng hướng dẫn này. */
  timeLimit: string;
  onTimeLimitChange: (v: string) => void;
  rubric: string[];
  onRubricChange: (v: string[]) => void;
}) {
  function updateCriterion(i: number, v: string) {
    onRubricChange(rubric.map((r, idx) => (idx === i ? v : r)));
  }
  function addCriterion() {
    onRubricChange([...rubric, ""]);
  }
  function removeCriterion(i: number) {
    onRubricChange(rubric.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Giới hạn số từ</span>
          <input
            type="number"
            value={wordLimit}
            onChange={(e) => onWordLimitChange(e.target.value)}
            className="input w-32 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Thời gian đề xuất (phút)</span>
          <input
            type="number"
            value={timeLimit}
            onChange={(e) => onTimeLimitChange(e.target.value)}
            placeholder="VD: 20"
            className="input w-32 text-sm"
          />
        </label>
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">
          Tiêu chí chấm (rubric) — Essay luôn chấm tay, không tự động
        </span>
        {rubric.map((r, i) => (
          <div key={i} className="mb-1 flex items-center gap-2">
            <input
              value={r}
              onChange={(e) => updateCriterion(i, e.target.value)}
              placeholder={`Tiêu chí ${i + 1}`}
              className="input flex-1 text-sm"
            />
            <button type="button" onClick={() => removeCriterion(i)} className="text-xs text-red">
              Xóa
            </button>
          </div>
        ))}
        <button type="button" onClick={addCriterion} className="text-sm font-semibold text-accent">
          + Thêm tiêu chí
        </button>
      </div>
    </div>
  );
}
