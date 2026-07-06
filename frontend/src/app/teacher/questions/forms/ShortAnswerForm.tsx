"use client";

export function ShortAnswerForm({
  acceptedAnswers,
  onAcceptedAnswersChange,
  caseSensitive,
  onCaseSensitiveChange,
}: {
  acceptedAnswers: string;
  onAcceptedAnswersChange: (v: string) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Đáp án chấp nhận (cách nhau bởi dấu phẩy)
        </span>
        <input
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="ví dụ: Paris, paris"
          className="input text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => onCaseSensitiveChange(e.target.checked)}
        />
        Phân biệt hoa/thường
      </label>
    </div>
  );
}
