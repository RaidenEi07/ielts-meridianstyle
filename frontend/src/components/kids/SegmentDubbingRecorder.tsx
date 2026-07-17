"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, dubbingApi, mediaApi } from "@/lib/api";
import type { DubbingRecording, DubbingSegment } from "@/lib/types";
import { useAudioRecorder } from "@/lib/useAudioRecorder";

export function SegmentDubbingRecorder({
  segment,
  token,
  recording,
  onChange,
}: {
  segment: DubbingSegment;
  token: string;
  recording: DubbingRecording | null;
  onChange: () => void;
}) {
  const { status, errorMessage, start, stop } = useAudioRecorder();
  // Mặc định theo `recording` (có bản ghi = chế độ "record"); `manualMode` chỉ
  // được đặt khi người dùng bấm nút chọn trực tiếp, ghi đè giá trị mặc định đó.
  const [manualMode, setManualMode] = useState<"original" | "record" | null>(null);
  const mode = manualMode ?? (recording ? "record" : "original");
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [localBlobUrl]);

  async function handleKeepOriginal() {
    if (recording) {
      setError(null);
      try {
        await dubbingApi.deleteRecording(token, recording.id);
        onChange();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không xóa được bản ghi âm");
        return;
      }
    }
    setManualMode("original");
  }

  function handleSwitchToRecord() {
    setManualMode("record");
  }

  async function handleToggleRecording() {
    if (status === "recording") {
      const blob = await stop();
      if (blob) {
        pendingBlobRef.current = blob;
        setLocalBlobUrl(URL.createObjectURL(blob));
      }
      return;
    }
    setError(null);
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
    setError(null);
    try {
      const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `long-tieng.${extension}`, { type: blob.type || "audio/webm" });
      const { url } = await mediaApi.uploadAudioAsStudent(token, file);
      await dubbingApi.saveRecording(token, segment.id, url);
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
      setLocalBlobUrl(null);
      pendingBlobRef.current = null;
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu bản ghi âm thất bại");
    } finally {
      setSaving(false);
    }
  }

  const isRecording = status === "recording";

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted">
        Đoạn {segment.startSeconds}s → {segment.endSeconds}s
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleKeepOriginal}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "original" ? "bg-primary text-white" : "border border-border text-muted"
          }`}
        >
          Giữ giọng gốc
        </button>
        <button
          type="button"
          onClick={handleSwitchToRecord}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "record" ? "bg-primary text-white" : "border border-border text-muted"
          }`}
        >
          Ghi âm giọng của bé
        </button>
      </div>

      {mode === "record" && (
        <div className="mt-3">
          {recording && !localBlobUrl && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-soft px-3 py-2">
              <span className="text-xs text-muted">Bản ghi hiện tại</span>
              <audio src={recording.audioUrl} controls className="h-9 flex-1" />
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={status === "error"}
              className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-md transition-colors disabled:opacity-60 ${
                isRecording ? "animate-pulse bg-red" : "bg-primary hover:bg-primary/90"
              }`}
              title={isRecording ? "Dừng ghi âm" : "Ghi âm giọng mới"}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <span className="text-xs text-muted">
              {isRecording ? "Đang ghi âm… bấm để dừng" : "Bấm để ghi âm giọng mới"}
            </span>
            {(status === "denied" || status === "error") && errorMessage && (
              <p className="text-center text-xs text-red">{errorMessage}</p>
            )}
          </div>

          {localBlobUrl && (
            <div className="mt-3 rounded-lg border border-border bg-soft p-3">
              <p className="mb-2 text-xs font-medium text-muted">Bản ghi vừa xong</p>
              <audio src={localBlobUrl} controls className="w-full" />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
