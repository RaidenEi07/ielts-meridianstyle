/** Chuẩn hóa mã màu người dùng gõ/dán vào thành "#RRGGBB" (in hoa); trả null nếu không hợp lệ. */
export function parseColorInput(input: string): string | null {
  const text = input.trim().replace(/;$/, "").trim();

  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return `#${digits.toUpperCase()}`;
  }

  const rgb = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/i.exec(text);
  if (rgb) {
    const channels = [rgb[1], rgb[2], rgb[3]].map(Number);
    if (channels.every((c) => c >= 0 && c <= 255)) {
      return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    }
  }

  return null;
}
