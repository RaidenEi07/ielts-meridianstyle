"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, mediaApi } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { shrinkImageForUpload } from "@/lib/imageUpload";
import { safeImageUrl } from "@/lib/siteConfig";
import { useBrokenImage } from "@/lib/useBrokenImage";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
/** Ảnh chọn từ máy (trước khi thu nhỏ): quá lớn thì trình duyệt giải mã rất chậm. */
const MAX_PICK_BYTES = 25 * 1024 * 1024;
/** Ảnh thật sự gửi lên (sau khi thu nhỏ). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Ảnh đầu trang chủ (ô ảnh bên phải tiêu đề). Xem thử trong đúng khung 4:3 và cách cắt như trang chủ thật.
 * Ảnh lớn được thu nhỏ ngay trên trình duyệt trước khi tải lên. Tải lên xong chỉ là xem thử: ảnh chỉ áp cho
 * mọi người sau khi bấm Lưu thay đổi của trang.
 */
export function HeroImageField({
  className = "",
  token,
  imageUrl,
  onChange,
}: {
  className?: string;
  token: string;
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = safeImageUrl(imageUrl);
  const image = useBrokenImage(url);
  const showImage = url !== "" && !image.broken;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);
    setNote(null);
    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError("Chỉ nhận ảnh JPG, PNG, WEBP hoặc SVG.");
      return;
    }
    if (picked.size > MAX_PICK_BYTES) {
      setError(`Ảnh quá lớn (${formatBytes(picked.size)}), tối đa ${formatBytes(MAX_PICK_BYTES)}.`);
      return;
    }
    setUploading(true);
    try {
      const file = await shrinkImageForUpload(picked);
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(
          `Ảnh còn ${formatBytes(file.size)} sau khi thu nhỏ, tối đa ${formatBytes(MAX_UPLOAD_BYTES)}. ` +
            "Hãy lưu ảnh dạng JPG: ảnh PNG nhiều chi tiết như ảnh chụp thường rất nặng.",
        );
        return;
      }
      const { url: uploaded } = await mediaApi.uploadImage(token, file);
      onChange(uploaded);
      if (file !== picked) {
        setNote(`Đã tự thu nhỏ ảnh từ ${formatBytes(picked.size)} xuống ${formatBytes(file.size)} cho trang chủ tải nhanh.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div data-testid="HeroImageField" className={className}>
      <span className="mb-1.5 block text-sm font-medium text-muted">Ảnh đầu trang chủ</span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          data-testid="hero-preview"
          className="aspect-[4/3] w-full max-w-xs shrink-0 overflow-hidden rounded-[18px] border border-border"
          style={
            showImage
              ? undefined
              : {
                  background:
                    "repeating-linear-gradient(45deg, var(--soft), var(--soft) 14px, var(--card) 14px, var(--card) 28px)",
                }
          }
        >
          {showImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...image.imgProps} src={url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              data-testid="hero-upload"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              {uploading ? "Đang xử lý…" : url ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setNote(null);
                }}
                data-testid="hero-remove"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-red"
              >
                Gỡ ảnh
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleFile}
              data-testid="hero-file-input"
            />
          </div>
          {url && image.broken && (
            <p className="text-xs text-red">Không tải được ảnh này, trang chủ sẽ hiện họa tiết mẫu. Hãy tải ảnh khác.</p>
          )}
          {error && <p className="text-xs text-red">{error}</p>}
          {note && <p data-testid="hero-note" className="text-xs text-green">{note}</p>}
          <p className="text-xs text-muted">
            Ảnh ngang tỉ lệ 4:3 (ví dụ 1200 × 900) hiển thị đẹp nhất; ảnh khác tỉ lệ sẽ bị cắt phần rìa như khung
            xem thử bên cạnh. JPG, PNG, WEBP hoặc SVG, ảnh lớn được tự thu nhỏ. Chưa có ảnh thì trang chủ hiện
            họa tiết sọc mẫu. Bấm Lưu thay đổi để áp dụng cho mọi người dùng.
          </p>
        </div>
      </div>
    </div>
  );
}
