"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Sparkles, Square, Star, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, mediaApi, vocabApi } from "@/lib/api";
import type { VocabRecording, VocabSetDetail } from "@/lib/types";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { useSpeechCheck } from "@/lib/useSpeechCheck";
import { useToast } from "@/store/toast";

/** Trình phát 1 bộ thẻ luyện từ vựng — nghe audio mẫu, ghi âm đọc lại, xem sao
 * đã chấm cho các lần ghi trước. Dùng chung useAudioRecorder với KidsVoiceRecorder. */
export function VocabSetPlayer({ setId, token }: { setId: number; token: string }) {
  const [detail, setDetail] = useState<VocabSetDetail | null>(null);
  const [index, setIndex] = useState(0);
  const { status, errorMessage, start, stop } = useAudioRecorder();
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordings, setRecordings] = useState<VocabRecording[]>([]);
  const toast = useToast();
  const speechCheck = useSpeechCheck();

  useEffect(() => {
    vocabApi
      .getSet(setId, token)
      .then((d) => {
        setDetail(d);
        setIndex(0);
      })
      .catch(() => setDetail(null));
  }, [setId, token]);

  const card = detail?.cards[index] ?? null;

  useEffect(() => {
    if (!card) return;
    if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    setLocalBlobUrl(null);
    pendingBlobRef.current = null;
    speechCheck.reset();
    vocabApi
      .myRecordings(card.id, token)
      .then(setRecordings)
      .catch(() => setRecordings([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, token]);

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
    if (localBlobUrl) {
      URL.revokeObjectURL(localBlobUrl);
      setLocalBlobUrl(null);
    }
    pendingBlobRef.current = null;
    await start();
  }

  async function handleSave() {
    const blob = pendingBlobRef.current;
    if (!blob || !card) return;
    setSaving(true);
    try {
      const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `doc-lai.${extension}`, { type: blob.type || "audio/webm" });
      const { url } = await mediaApi.uploadAudioAsStudent(token, file);
      const saved = await vocabApi.saveRecording(card.id, url, token);
      setRecordings((prev) => [saved, ...prev]);
      URL.revokeObjectURL(localBlobUrl!);
      setLocalBlobUrl(null);
      pendingBlobRef.current = null;
      toast.success("Đã lưu bản ghi âm");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Lưu bản ghi âm thất bại");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    setLocalBlobUrl(null);
    pendingBlobRef.current = null;
  }

  if (!detail) {
    return <p className="text-sm text-muted">Đang tải…</p>;
  }
  if (!card) {
    return <p className="text-sm text-muted">Bộ thẻ này chưa có thẻ nào.</p>;
  }

  const isRecording = status === "recording";
  const latestRating = recordings.find((r) => r.starRating != null)?.starRating ?? null;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Thẻ {index + 1}/{detail.cards.length}
        </span>
        <span>{card.cardType === "WORD" ? "Từ vựng" : "Câu ví dụ"}</span>
      </div>

      <p className="mt-2 text-lg font-semibold">{card.text}</p>

      <audio key={card.audioUrl} src={card.audioUrl} controls className="mt-3 w-full" />

      {speechCheck.isSupported && (
        <div className="mt-3 flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border bg-bg p-3">
          <button
            type="button"
            onClick={() => speechCheck.check(card.acceptedAnswer)}
            disabled={speechCheck.status === "listening"}
            className="flex items-center gap-1.5 rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {speechCheck.status === "listening" ? "Đang nghe…" : "Kiểm tra nhanh (tự luyện)"}
          </button>
          {speechCheck.status === "correct" && (
            <p className="flex items-center gap-1 text-xs font-medium text-green">
              <CheckCircle2 className="h-3.5 w-3.5" /> Có vẻ đúng rồi!
            </p>
          )}
          {speechCheck.status === "wrong" && (
            <p className="flex items-center gap-1 text-xs font-medium text-red">
              <XCircle className="h-3.5 w-3.5" />
              Chưa khớp{speechCheck.transcript ? ` — trình duyệt nghe thành "${speechCheck.transcript}"` : ""}, thử lại nhé
            </p>
          )}
          {speechCheck.status === "no-speech" && (
            <p className="text-xs text-muted">Chưa nghe thấy gì, bấm lại và nói to hơn nhé.</p>
          )}
          {speechCheck.status === "denied" && (
            <p className="text-xs text-muted">Bạn cần cho phép dùng micro để dùng tính năng này.</p>
          )}
          {speechCheck.status === "error" && (
            <p className="text-xs text-muted">Không kiểm tra được lúc này, thử lại sau nhé.</p>
          )}
          <p className="text-center text-[11px] text-faint">
            Chỉ để tự luyện — điểm chính thức vẫn do giáo viên chấm ở bản ghi âm bên dưới.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-soft p-4">
        <button
          type="button"
          onClick={handleToggle}
          className={`grid h-16 w-16 place-items-center rounded-full text-white shadow-md transition-colors disabled:opacity-60 ${
            isRecording ? "animate-pulse bg-red" : "bg-primary hover:bg-primary/90"
          }`}
          title={isRecording ? "Dừng ghi âm" : "Ghi âm đọc lại"}
        >
          {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <span className="text-xs font-medium text-muted">
          {isRecording ? "Đang ghi âm… bấm để dừng" : "Bấm để ghi âm đọc lại"}
        </span>
        {(status === "denied" || status === "error") && errorMessage && (
          <p className="max-w-xs text-center text-xs text-red">{errorMessage}</p>
        )}

        {localBlobUrl && (
          <div className="mt-1 w-full rounded-lg border border-border bg-surface p-2.5">
            <audio src={localBlobUrl} controls className="w-full" />
            <div className="mt-2 flex justify-center gap-2">
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
          </div>
        )}
      </div>

      {recordings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted">Các lần ghi trước</p>
          {recordings.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
              <audio src={r.audioUrl} controls className="h-8 flex-1" />
              {r.starRating != null ? (
                <span className="flex shrink-0 items-center gap-0.5" title={`${r.starRating}/5 sao`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3 w-3 ${n <= r.starRating! ? "fill-accent text-accent" : "text-border"}`}
                    />
                  ))}
                </span>
              ) : (
                <span className="shrink-0 text-[11px] text-faint">Chưa chấm</span>
              )}
            </div>
          ))}
        </div>
      )}

      {latestRating == null && recordings.length === 0 && (
        <p className="mt-3 text-xs text-faint">Nghe audio mẫu rồi ghi âm đọc lại — giáo viên sẽ chấm sao.</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Trước
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(detail.cards.length - 1, i + 1))}
          disabled={index === detail.cards.length - 1}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted disabled:opacity-40"
        >
          Tiếp <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
