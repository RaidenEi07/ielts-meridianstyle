"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ApiError, mediaApi } from "@/lib/api";
import { safeImageUrl } from "@/lib/siteConfig";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Logo trung tâm: tải ảnh lên, xem thử ngay trên đúng 2 nền mà logo sẽ nằm (thanh đầu trang sáng và panel
 * đăng nhập/thanh phòng thi màu đậm), gỡ logo, và chọn chỉ hiện logo (cho logo đã có chữ).
 * Ảnh tải lên là dùng được ngay để xem thử nhưng chỉ áp cho mọi người sau khi bấm Lưu thay đổi của trang.
 */
export function LogoField({
  className = "",
  token,
  siteName,
  logoUrl,
  hideName,
  onLogoUrlChange,
  onHideNameChange,
}: {
  className?: string;
  token: string;
  siteName: string;
  logoUrl: string;
  hideName: boolean;
  onLogoUrlChange: (url: string) => void;
  onHideNameChange: (hide: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = safeImageUrl(logoUrl);
  const preview = { siteName, logoUrl: url, logoOnly: hideName };

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Chỉ nhận ảnh PNG, JPG, WEBP hoặc SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh quá lớn, tối đa 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url: uploaded } = await mediaApi.uploadImage(token, file);
      onLogoUrlChange(uploaded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải logo thất bại");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div data-testid="LogoField" className={className}>
      <span className="mb-1.5 block text-sm font-medium text-muted">Logo trung tâm</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div
            data-testid="logo-preview-light"
            className="flex min-h-16 items-center rounded-lg border border-border bg-bg px-4 py-3"
          >
            <Logo preview={preview} />
          </div>
          <p className="mt-1 text-xs text-muted">Thanh đầu trang</p>
        </div>
        <div>
          <div
            data-testid="logo-preview-dark"
            className="flex min-h-16 items-center rounded-lg bg-primary px-4 py-3"
          >
            <Logo onDark preview={preview} className="text-white [&_span]:text-white" />
          </div>
          <p className="mt-1 text-xs text-muted">Trang đăng nhập và thanh phòng thi</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          data-testid="logo-upload"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {uploading ? "Đang tải…" : url ? "Đổi logo" : "Tải logo lên"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => {
              onLogoUrlChange("");
              onHideNameChange(false);
            }}
            data-testid="logo-remove"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-red"
          >
            Gỡ logo
          </button>
        )}
        <label className={`flex items-center gap-2 text-sm ${url ? "" : "opacity-50"}`}>
          <input
            type="checkbox"
            checked={hideName && url !== ""}
            disabled={!url}
            onChange={(e) => onHideNameChange(e.target.checked)}
            data-testid="logo-hide-name"
          />
          Chỉ hiện logo, không ghi tên bên cạnh
        </label>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFile}
          data-testid="logo-file-input"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      <p className="mt-1.5 text-xs text-muted">
        PNG, JPG, WEBP hoặc SVG, tối đa 2 MB. Logo hiển thị cao khoảng 36 px nên nền trong suốt là đẹp nhất; bật
        &quot;Chỉ hiện logo&quot; nếu logo đã có sẵn tên trung tâm. Bấm Lưu thay đổi để áp dụng cho mọi người dùng.
      </p>
    </div>
  );
}
