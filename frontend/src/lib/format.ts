/** Dung lượng file dạng dễ đọc, vd. "340 KB", "6,2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}
