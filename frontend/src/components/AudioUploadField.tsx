"use client";

import { Music, X } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, mediaApi } from "@/lib/api";

export function AudioUploadField({
  token,
  value,
  onChange,
  label = "File audio",
}: {
  token: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { url } = await mediaApi.uploadAudio(token, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải audio thất bại");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Music className="h-4 w-4 shrink-0 text-muted" />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={value} controls className="h-9 max-w-xs" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="shrink-0 text-faint hover:text-red"
              title="Gỡ audio"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid h-12 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted">
            <Music className="h-5 w-5" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text disabled:opacity-60"
        >
          {uploading ? "Đang tải…" : value ? "Đổi file" : "Tải file lên"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
