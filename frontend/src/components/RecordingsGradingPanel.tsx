"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, recordingAdminApi } from "@/lib/api";
import type { AdminLessonRecording } from "@/lib/types";
import { useToast } from "@/store/toast";

export function RecordingsGradingPanel({ sectionId, token }: { sectionId: number; token: string }) {
  const [recordings, setRecordings] = useState<AdminLessonRecording[] | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const toast = useToast();

  function refresh() {
    recordingAdminApi.listForSection(token, sectionId).then(setRecordings).catch(() => setRecordings([]));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function rate(recordingId: number, stars: number) {
    setSavingId(recordingId);
    try {
      await recordingAdminApi.rate(token, recordingId, stars);
      setRecordings((prev) =>
        prev ? prev.map((r) => (r.id === recordingId ? { ...r, starRating: stars } : r)) : prev,
      );
      toast.success(`Đã chấm ${stars} sao`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chấm sao thất bại");
    } finally {
      setSavingId(null);
    }
  }

  if (!recordings || recordings.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="mb-2 text-sm font-semibold">Chấm sao bài ghi âm luyện nói</h4>
      <div className="space-y-2">
        {recordings.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-soft px-3 py-2">
            <span className="w-32 shrink-0 truncate text-sm font-medium">{r.userFullName}</span>
            <audio src={r.audioUrl} controls className="h-9 flex-1 min-w-[180px]" />
            <div className="flex shrink-0 items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={savingId === r.id}
                  onClick={() => rate(r.id, n)}
                  title={`${n} sao`}
                  className="disabled:opacity-60"
                >
                  <Star
                    className={`h-5 w-5 ${
                      r.starRating != null && n <= r.starRating
                        ? "fill-accent text-accent"
                        : "text-border hover:text-accent"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
