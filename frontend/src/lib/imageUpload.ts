// Thu nhỏ ảnh lớn ngay trên trình duyệt trước khi tải lên. Ảnh chụp từ điện thoại thường nặng 3–8 MB và rộng
// 4000 px, quá nặng cho ảnh trang chủ (người xem tải chậm) trong khi ô hiển thị chỉ rộng khoảng 600 px.

/** Chỉ ảnh điểm ảnh thông dụng: SVG là vector, GIF có thể là ảnh động nên để nguyên. */
const SHRINKABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ShrinkOptions {
  /** Cạnh dài nhất sau khi thu nhỏ (px). */
  maxSide?: number;
  /** Chất lượng JPEG/WebP (0–1). */
  quality?: number;
  /** Ảnh đã vừa cỡ và nhẹ hơn mức này thì giữ nguyên, khỏi nén lại làm giảm chất lượng. */
  keepBelowBytes?: number;
}

/**
 * Trả về ảnh đã thu nhỏ (cùng định dạng, nên PNG trong suốt vẫn trong suốt), hoặc chính `file` khi không cần
 * hoặc không thu nhỏ được. Không bao giờ ném lỗi: trình duyệt cũ, ảnh hỏng... đều trả về bản gốc.
 */
export async function shrinkImageForUpload(
  file: File,
  { maxSide = 1600, quality = 0.86, keepBelowBytes = 800_000 }: ShrinkOptions = {},
): Promise<File> {
  if (!SHRINKABLE_TYPES.has(file.type)) return file;
  try {
    // createImageBitmap xoay ảnh theo EXIF (ảnh chụp dọc từ điện thoại) nên không bị nằm ngang.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= keepBelowBytes) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, quality));
    // Trình duyệt không mã hóa được định dạng này (vd. WebP trên Safari cũ) sẽ trả về PNG; kết quả không nhỏ
    // hơn bản gốc thì cũng chẳng ích gì. Cả hai trường hợp giữ bản gốc.
    if (!blob || blob.type !== file.type || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
