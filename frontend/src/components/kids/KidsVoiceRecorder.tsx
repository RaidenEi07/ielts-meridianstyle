"use client";

import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, mediaApi, recordingApi } from "@/lib/api";
import type { LessonRecording } from "@/lib/types";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { useConfirm } from "@/store/confirm";

export function KidsVoiceRecorder({ sectionId, token }: { sectionId: number; token: string }) {
  const { status, errorMessage, start, stop } = useAudioRecorder();
  const confirm = useConfirm();
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<LessonRecording[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    recordingApi
      .list(sectionId, token)
      .then(setRecordings)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [sectionId, token]);

  useEffect(() => {
    return () => {
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [localBlobUrl]);

  async function handleToggle() {
    if (status === "recording") {
      const blob = await stop();
      if (blob) {
        pendingBlobRef.current = blob;
        setLocalBlobUrl(URL.createObjectURL(blob));
      }
      return;
    }
    setSaveError(null);
    if (localBlobUrl) {
      URL.revokeObjectURL(localBlobUrl);
      setLocalBlobUrl(null);
    }
    pendingBlobRef.current = null;
    await start();
  }

  async function handleSave() {
    const blob = pendingBlobRef.current;
    if (!blob) return;
    setSaving(true);
    setSaveError(null);
    try {
      const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `ghi-am.${extension}`, { type: blob.type || "audio/webm" });
      const { url } = await mediaApi.uploadAudioAsStudent(token, file);
      const saved = await recordingApi.save(sectionId, url, token);
      setRecordings((prev) => [saved, ...prev]);
      URL.revokeObjectURL(localBlobUrl!);
      setLocalBlobUrl(null);
      pendingBlobRef.current = null;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Lưu bản ghi âm thất bại");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    setLocalBlobUrl(null);
    pendingBlobRef.current = null;
  }

  async function handleDelete(recording: LessonRecording) {
    if (!(await confirm("Xóa bản ghi âm này?"))) return;
    try {
      await recordingApi.remove(recording.id, token);
      setRecordings((prev) => prev.filter((r) => r.id !== recording.id));
    } catch {
      // best-effort UI cleanup — không chặn người dùng nếu xóa lỗi
    }
  }

  const isRecording = status === "recording";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-base font-bold">🎤 Luyện nói</h3>
      <p className="mt-1 text-sm text-muted">
        Bấm nút để ghi âm giọng nói, nghe lại ngay sau khi ghi xong.
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={status === "error"}
          className={`grid h-20 w-20 place-items-center rounded-full text-white shadow-md transition-colors disabled:opacity-60 ${
            isRecording ? "animate-pulse bg-red" : "bg-primary hover:bg-primary/90"
          }`}
          title={isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
        >
          {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <span className="text-sm font-medium text-muted">
          {isRecording ? "Đang ghi âm… bấm để dừng" : "Bấm để bắt đầu ghi âm"}
        </span>

        {status === "denied" && errorMessage && (
          <p className="max-w-xs text-center text-sm text-red">{errorMessage}</p>
        )}
        {status === "error" && errorMessage && (
          <p className="max-w-xs text-center text-sm text-red">{errorMessage}</p>
        )}
      </div>

      {localBlobUrl && (
        <div className="mt-4 rounded-xl border border-border bg-soft p-3">
          <p className="mb-2 text-xs font-medium text-muted">Bản ghi vừa xong</p>
          <audio src={localBlobUrl} controls className="w-full" />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-text disabled:opacity-60"
            >
              Bỏ
            </button>
          </div>
          {saveError && <p className="mt-1 text-xs text-red">{saveError}</p>}
        </div>
      )}

      {loaded && recordings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted">Các bản ghi trước đó</p>
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <audio src={r.audioUrl} controls className="h-9 flex-1" />
              <button
                type="button"
                onClick={() => handleDelete(r)}
                className="shrink-0 text-faint hover:text-red"
                title="Xóa bản ghi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
