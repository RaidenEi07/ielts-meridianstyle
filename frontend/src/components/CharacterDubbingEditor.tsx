"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, dubbingAdminApi, dubbingApi } from "@/lib/api";
import type { DubbingCharacter } from "@/lib/types";
import { isYoutubeUrl } from "@/lib/youtube";

export function CharacterDubbingEditor({
  sectionId,
  token,
  videoUrl,
}: {
  sectionId: number;
  token: string;
  videoUrl?: string | null;
}) {
  const [characters, setCharacters] = useState<DubbingCharacter[] | null>(null);
  const [newName, setNewName] = useState("");
  const [segmentDrafts, setSegmentDrafts] = useState<Record<number, { start: string; end: string }>>({});
  const [error, setError] = useState<string | null>(null);

  function load() {
    dubbingApi
      .characters(token, sectionId)
      .then(setCharacters)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được nhân vật"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function handleAddCharacter() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await dubbingAdminApi.createCharacter(token, sectionId, newName.trim());
      setNewName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm nhân vật thất bại");
    }
  }

  async function handleRemoveCharacter(id: number) {
    setError(null);
    try {
      await dubbingAdminApi.deleteCharacter(token, id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa nhân vật thất bại");
    }
  }

  async function handleAddSegment(characterId: number) {
    const draft = segmentDrafts[characterId];
    const start = Number(draft?.start);
    const end = Number(draft?.end);
    if (!draft || Number.isNaN(start) || Number.isNaN(end)) return;
    setError(null);
    try {
      await dubbingAdminApi.addSegment(token, characterId, start, end);
      setSegmentDrafts((prev) => ({ ...prev, [characterId]: { start: "", end: "" } }));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm đoạn thoại thất bại");
    }
  }

  async function handleRemoveSegment(id: number) {
    setError(null);
    try {
      await dubbingAdminApi.deleteSegment(token, id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa đoạn thoại thất bại");
    }
  }

  if (videoUrl && isYoutubeUrl(videoUrl)) {
    return (
      <div>
        <span className="mb-1 block text-xs font-medium text-muted">Lồng tiếng nhân vật</span>
        <p className="text-xs text-muted">
          Lồng tiếng nhân vật cần video tải lên server — không áp dụng cho video YouTube.
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">Lồng tiếng nhân vật</span>

      {characters && characters.length > 0 && (
        <div className="mb-2 space-y-3">
          {characters.map((c) => {
            const draft = segmentDrafts[c.id] ?? { start: "", end: "" };
            return (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCharacter(c.id)}
                    className="text-faint hover:text-red"
                    title="Xóa nhân vật"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {c.segments.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {c.segments.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs text-muted">
                        <span>
                          {s.startSeconds}s → {s.endSeconds}s
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(s.id)}
                          className="text-faint hover:text-red"
                          title="Xóa đoạn"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={draft.start}
                    onChange={(e) =>
                      setSegmentDrafts((prev) => ({
                        ...prev,
                        [c.id]: { ...draft, start: e.target.value },
                      }))
                    }
                    placeholder="Bắt đầu (giây)"
                    className="input w-32 text-xs"
                  />
                  <input
                    type="number"
                    value={draft.end}
                    onChange={(e) =>
                      setSegmentDrafts((prev) => ({
                        ...prev,
                        [c.id]: { ...draft, end: e.target.value },
                      }))
                    }
                    placeholder="Kết thúc (giây)"
                    className="input w-32 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSegment(c.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
                  >
                    + Thêm đoạn
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên nhân vật mới, vd: Mèo con"
          className="input flex-1 text-sm"
        />
        <button
          type="button"
          onClick={handleAddCharacter}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
        >
          + Thêm nhân vật
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
