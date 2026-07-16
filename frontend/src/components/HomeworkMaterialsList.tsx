"use client";

import { Music, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { homeworkApi } from "@/lib/api";
import type { HomeworkMaterial } from "@/lib/types";

export function HomeworkMaterialsList({ sectionId, token }: { sectionId: number; token: string }) {
  const [materials, setMaterials] = useState<HomeworkMaterial[]>([]);

  useEffect(() => {
    homeworkApi
      .list(sectionId, token)
      .then(setMaterials)
      .catch(() => setMaterials([]));
  }, [sectionId, token]);

  if (materials.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">📚 Tài liệu bài tập về nhà</h2>
      <div className="mt-3 space-y-3">
        {materials.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2">
            {m.mediaType === "AUDIO" ? (
              <Music className="h-4 w-4 shrink-0 text-muted" />
            ) : (
              <Video className="h-4 w-4 shrink-0 text-muted" />
            )}
            <span className="w-32 shrink-0 text-sm text-muted">
              {m.label || `${m.mediaType === "AUDIO" ? "Audio" : "Video"} ${i + 1}`}
            </span>
            {m.mediaType === "AUDIO" ? (
              <audio src={m.url} controls className="h-9 flex-1" />
            ) : (
              <video src={m.url} controls className="h-40 flex-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
