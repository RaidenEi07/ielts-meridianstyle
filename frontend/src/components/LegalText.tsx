/**
 * Hiển thị văn bản Điều khoản / Chính sách bảo mật do trung tâm tự soạn (văn bản thuần, xem LegalPagesSection).
 * Đoạn cách nhau bằng dòng trống; dòng bắt đầu bằng "## " là tiêu đề mục. Chỉ dựng text node nên không có HTML
 * nào chạy được dù nội dung do người quản trị nhập.
 */
export function LegalText({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div data-testid="LegalText" className="space-y-4">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <h2 key={i}>{block.slice(3).trim()}</h2>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        ),
      )}
    </div>
  );
}
