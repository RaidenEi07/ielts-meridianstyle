"use client";

import { Music, Video, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AudioUploadField } from "@/components/AudioUploadField";
import { VideoUploadField } from "@/components/VideoUploadField";
import { ApiError, homeworkAdminApi, homeworkApi } from "@/lib/api";
import type { HomeworkMaterial } from "@/lib/types";

export function HomeworkMaterialsEditor({ sectionId, token }: { sectionId: number; token: string }) {
  const [materials, setMaterials] = useState<HomeworkMaterial[] | null>(null);
  const [addType, setAddType] = useState<"AUDIO" | "VIDEO" | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    homeworkApi
      .list(sectionId, token)
      .then(setMaterials)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được tài liệu"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function handleUploaded(url: string | null) {
    if (!url || !addType) return;
    setError(null);
    try {
      await homeworkAdminApi.create(token, sectionId, { mediaType: addType, url, label: label || null });
      setAddType(null);
      setLabel("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm tài liệu thất bại");
    }
  }

  async function handleRemove(id: number) {
    setError(null);
    try {
      await homeworkAdminApi.remove(token, id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa tài liệu thất bại");
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">Tài liệu bài tập về nhà</span>

      {materials && materials.length > 0 && (
        <div className="mb-2 space-y-2">
          {materials.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              {m.mediaType === "AUDIO" ? (
                <Music className="h-4 w-4 shrink-0 text-muted" />
              ) : (
                <Video className="h-4 w-4 shrink-0 text-muted" />
              )}
              <span className="text-xs text-muted">
                {m.label || `${m.mediaType === "AUDIO" ? "Audio" : "Video"} ${i + 1}`}
              </span>
              {m.mediaType === "AUDIO" ? (
                <audio src={m.url} controls className="h-9 max-w-xs" />
              ) : (
                <video src={m.url} controls className="h-16 max-w-xs" />
              )}
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="ml-auto shrink-0 text-faint hover:text-red"
                title="Xóa tài liệu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {addType ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nhãn (tùy chọn), vd: Audio 1 - Từ vựng"
            className="input w-full text-sm"
          />
          {addType === "AUDIO" ? (
            <AudioUploadField token={token} value={null} onChange={handleUploaded} label="Tải file audio" />
          ) : (
            <VideoUploadField token={token} value={null} onChange={handleUploaded} label="Tải file video" />
          )}
          <button
            type="button"
            onClick={() => {
              setAddType(null);
              setLabel("");
            }}
            className="text-xs text-muted hover:text-text"
          >
            Hủy
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAddType("AUDIO")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
          >
            + Thêm audio
          </button>
          <button
            type="button"
            onClick={() => setAddType("VIDEO")}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
          >
            + Thêm video
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
