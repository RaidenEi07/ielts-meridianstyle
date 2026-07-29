"use client";

import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ApiError, checkpointApi, questionBankApi } from "@/lib/api";
import type { Audience, QuestionSummary } from "@/lib/types";
import { useToast } from "@/store/toast";

function secondsToClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clockToSeconds(clock: string): number | null {
  const parts = clock.trim().split(":");
  if (parts.length === 1) {
    const s = Number(parts[0]);
    return Number.isFinite(s) && s >= 0 ? s : null;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0) return null;
    return m * 60 + s;
  }
  return null;
}

interface DraftCheckpoint {
  clock: string;
  questionId: number | "";
}

export function VideoCheckpointsEditor({
  sectionId,
  token,
  audience,
}: {
  sectionId: number;
  token: string;
  audience: Audience;
}) {
  const [draft, setDraft] = useState<DraftCheckpoint[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    checkpointApi
      .listForSection(token, sectionId)
      .then((cps) => {
        setDraft(
          [...cps]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ clock: secondsToClock(c.timestampSec), questionId: c.questionId })),
        );
      })
      .catch(() => setDraft([]))
      .finally(() => setLoading(false));
    questionBankApi.questions(token, undefined, audience).then(setQuestions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  function addRow() {
    setSaved(false);
    setDraft((prev) => [...prev, { clock: "0:00", questionId: "" }]);
  }
  function updateRow(i: number, patch: Partial<DraftCheckpoint>) {
    setSaved(false);
    setDraft((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setSaved(false);
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    setSaved(false);
    const items: { timestampSec: number; questionId: number; sortOrder: number }[] = [];
    for (const row of draft) {
      const sec = clockToSeconds(row.clock);
      if (sec === null || !row.questionId) {
        const msg = "Mỗi checkpoint cần mốc thời gian hợp lệ (vd 1:05) và 1 câu hỏi đã chọn.";
        setError(msg);
        toast.error(msg);
        return;
      }
      items.push({ timestampSec: sec, questionId: row.questionId, sortOrder: items.length });
    }
    setSaving(true);
    try {
      await checkpointApi.replaceForSection(token, sectionId, items);
      setSaved(true);
      toast.success("Đã lưu checkpoint");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Lưu checkpoint thất bại";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Câu hỏi trong video</h4>
        <span className="text-xs text-muted">
          {draft.length > 0
            ? `${draft.length} checkpoint — section này là "khóa học lõi"`
            : "Chưa có checkpoint nào"}
        </span>
      </div>
      {draft.map((row, i) => (
        <div key={i} className="mb-2 flex items-center gap-2">
          <input
            value={row.clock}
            onChange={(e) => updateRow(i, { clock: e.target.value })}
            placeholder="0:05"
            title="Mốc thời gian (phút:giây)"
            className="input w-20 text-sm"
          />
          <div className="flex-1">
            <SearchableSelect
              value={row.questionId}
              onChange={(v) => updateRow(i, { questionId: v })}
              placeholder="Chọn câu hỏi…"
              options={questions.map((q) => ({ value: q.id, label: `${q.name} (${q.type})` }))}
            />
          </div>
          <button type="button" onClick={() => removeRow(i)} className="text-xs text-red">
            Xóa
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={addRow} className="text-sm font-semibold text-accent">
          + Thêm mốc
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        {saved && <span className="text-xs text-green">Đã lưu</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
