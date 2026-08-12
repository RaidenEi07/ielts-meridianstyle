"use client";

import { Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, vocabAdminApi } from "@/lib/api";
import type { AdminVocabRecording, VocabSetSummary } from "@/lib/types";
import { useConfirm } from "@/store/confirm";
import { useToast } from "@/store/toast";

/** Admin/giáo viên: xem bộ thẻ luyện từ vựng gắn vào 1 section + xóa bộ thẻ +
 * chấm sao bản ghi âm học sinh. Soạn/import bộ thẻ mới làm qua script (không
 * qua UI này) — panel này chỉ để quản lý những gì đã có. */
export function VocabAdminPanel({ sectionId, token }: { sectionId: number; token: string }) {
  const [sets, setSets] = useState<VocabSetSummary[] | null>(null);
  const [openSetId, setOpenSetId] = useState<number | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  function refresh() {
    vocabAdminApi.listSets(token, sectionId).then(setSets).catch(() => setSets([]));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function handleDelete(set: VocabSetSummary) {
    if (
      !(await confirm(
        `Xóa bộ thẻ "${set.title}"? Toàn bộ ${set.cardCount} thẻ và bản ghi âm học sinh trong bộ này sẽ mất.`,
      ))
    )
      return;
    try {
      await vocabAdminApi.deleteSet(token, set.id);
      toast.success("Đã xóa bộ thẻ");
      if (openSetId === set.id) setOpenSetId(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa thất bại");
    }
  }

  if (!sets || sets.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="mb-2 text-sm font-semibold">Bộ thẻ luyện từ vựng & phát âm</h4>
      <div className="space-y-2">
        {sets.map((s) => {
          const open = openSetId === s.id;
          return (
            <div key={s.id} className="rounded-lg bg-soft">
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpenSetId(open ? null : s.id)}
                  className="flex-1 text-left text-sm font-medium"
                >
                  {s.title} <span className="text-xs font-normal text-muted">({s.cardCount} thẻ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s)}
                  className="shrink-0 text-faint hover:text-red"
                  title="Xóa bộ thẻ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {open && (
                <div className="border-t border-border p-3">
                  <VocabSetGradingQueue setId={s.id} token={token} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VocabSetGradingQueue({ setId, token }: { setId: number; token: string }) {
  const [recordings, setRecordings] = useState<AdminVocabRecording[] | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    vocabAdminApi
      .recordingsForSet(token, setId)
      .then(setRecordings)
      .catch(() => setRecordings([]));
  }, [setId, token]);

  async function rate(recordingId: number, stars: number) {
    setSavingId(recordingId);
    try {
      await vocabAdminApi.rate(token, recordingId, stars);
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

  if (!recordings) return <p className="text-xs text-muted">Đang tải…</p>;
  if (recordings.length === 0) {
    return <p className="text-xs text-muted">Chưa có học sinh nào ghi âm bộ thẻ này.</p>;
  }

  return (
    <div className="space-y-2">
      {recordings.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2">
          <span className="w-28 shrink-0 truncate text-xs font-medium" title={r.userFullName}>
            {r.userFullName}
          </span>
          <span className="w-40 shrink-0 truncate text-xs text-muted" title={r.cardText}>
            {r.cardText}
          </span>
          <audio src={r.audioUrl} controls className="h-9 min-w-[160px] flex-1" />
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
                  className={`h-4 w-4 ${
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
  );
}
