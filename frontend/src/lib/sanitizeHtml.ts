/**
 * Xóa màu chữ/nền HARDCODE trong inline style của HTML — phần lớn nội dung
 * câu hỏi/đoạn văn của dự án được dán từ Google Docs lúc soạn/di trú, luôn
 * kèm `color: #000000; background-color: transparent` tuyệt đối trên từng
 * <span> (dấu hiệu: id="docs-internal-guid-..."). Inline style có độ ưu
 * tiên cao nhất trong CSS — thắng mọi biến màu theo token (--text, .prose,
 * .exam-mode...), nên chữ đen tuyệt đối này trở nên VÔ HÌNH bất cứ khi nào
 * hiển thị trên nền tối (dark mode ở các màn xem trước — màn làm bài thật
 * không bị vì .exam-mode ép nền về trắng nên đen-trên-trắng vẫn đúng).
 *
 * Xóa color/background ngay lúc RENDER (không sửa dữ liệu gốc trong DB) —
 * giữ nguyên các thuộc tính style khác (bold, size, font, line-height...).
 */
export function stripInlineTextColors(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    el.style.removeProperty("color");
    el.style.removeProperty("background-color");
    el.style.removeProperty("background");
    if (!el.getAttribute("style")?.trim()) el.removeAttribute("style");
  });
  return container.innerHTML;
}
