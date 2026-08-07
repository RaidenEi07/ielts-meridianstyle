"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { checkpointApi } from "@/lib/api";
import { isYoutubeUrl, toYoutubeEmbedUrl } from "@/lib/youtube";
import type { CheckpointQuestion, PlayerQuestion, VideoCheckpoint } from "@/lib/types";
import { parseVtt, type VttCue } from "./VttParser";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toPlayerQuestion(q: CheckpointQuestion): PlayerQuestion {
  return {
    quizQuestionId: q.questionId,
    questionId: q.questionId,
    type: q.type,
    name: q.name,
    stem: q.stem,
    mark: 0,
    pageId: null,
    passageId: null,
    settings: q.settings,
    options: q.options,
    matchingPairs: q.matchingPairs,
    matchingRightPool: q.matchingRightPool,
    dragItems: q.dragItems,
    dragZones: q.dragZones,
    clozeSubAnswers: q.clozeSubAnswers,
    gridColumns: q.gridColumns,
    gridRows: q.gridRows,
    audience: q.audience,
    correctAnswerCount: null,
    groupIntro: null,
  };
}

export function LessonVideoPlayer({
  videoUrl,
  subtitleUrl,
  checkpoints,
  token,
  onCheckpointAnswered,
}: {
  videoUrl: string;
  subtitleUrl?: string | null;
  /** Câu hỏi popup theo mốc thời gian (khóa học lõi) — chỉ hỗ trợ video tải lên trực tiếp, không hỗ trợ YouTube. */
  checkpoints?: VideoCheckpoint[];
  token?: string | null;
  onCheckpointAnswered?: (checkpointId: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cues, setCues] = useState<VttCue[]>([]);
  const [videoError, setVideoError] = useState(false);
  const isYoutube = isYoutubeUrl(videoUrl);

  const answeredIds = useMemo(
    () => new Set((checkpoints ?? []).filter((c) => c.answered).map((c) => c.id!)),
    [checkpoints],
  );
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<CheckpointQuestion | null>(null);
  const [answer, setAnswer] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!subtitleUrl || isYoutube) return;
    fetch(subtitleUrl)
      .then((res) => res.text())
      .then((text) => setCues(parseVtt(text)))
      .catch(() => setCues([]));
  }, [subtitleUrl, isYoutube]);

  function seekTo(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = seconds;
    v.play().catch(() => {});
  }

  function handleTimeUpdate() {
    if (!checkpoints || checkpoints.length === 0 || activeCheckpoint || !token) return;
    const v = videoRef.current;
    if (!v) return;
    const due = checkpoints.find(
      (c) => !answeredIds.has(c.id!) && v.currentTime >= c.timestampSec,
    );
    if (!due) return;
    v.pause();
    setActiveCheckpoint(due);
    setAnswer(null);
    checkpointApi.getPlayerQuestion(token, due.id!).then(setActiveQuestion).catch(() => {
      // Không tải được câu hỏi — mở lại video để không kẹt học viên.
      setActiveCheckpoint(null);
    });
  }

  async function submitCheckpointAnswer() {
    if (!activeCheckpoint || !token) return;
    setSubmitting(true);
    try {
      await checkpointApi.submitAnswer(token, activeCheckpoint.id!, answer);
      onCheckpointAnswered?.(activeCheckpoint.id!);
      setActiveCheckpoint(null);
      setActiveQuestion(null);
      videoRef.current?.play().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  if (isYoutube) {
    const embedUrl = toYoutubeEmbedUrl(videoUrl);
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        {embedUrl && (
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {videoError ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-black text-center text-sm text-white/80">
          <p>Video không tải được.</p>
          <p className="text-xs text-white/60">Vui lòng kiểm tra kết nối mạng và tải lại trang.</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          src={videoUrl}
          onError={() => setVideoError(true)}
          onTimeUpdate={handleTimeUpdate}
          className="w-full rounded-xl border border-border bg-black"
        >
          {subtitleUrl && (
            <track kind="subtitles" src={subtitleUrl} srcLang="vi" label="Tiếng Việt" default />
          )}
        </video>
      )}

      {cues.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted">Tua theo đoạn</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {cues.map((cue, i) => (
              <button
                key={i}
                type="button"
                onClick={() => seekTo(cue.start)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-soft"
              >
                <span
                  className="shrink-0 text-xs text-muted"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatTime(cue.start)}
                </span>
                <span className="line-clamp-1">{cue.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeCheckpoint && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6">
          <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold">Dừng lại trả lời câu hỏi</h3>
            <p className="mb-4 text-sm text-muted">
              Trả lời để tiếp tục xem video — {formatTime(activeCheckpoint.timestampSec)}.
            </p>
            {activeQuestion ? (
              <>
                <p className="mb-3 font-medium">{activeQuestion.name}</p>
                <QuestionRenderer
                  question={toPlayerQuestion(activeQuestion)}
                  answer={answer}
                  onChange={setAnswer}
                />
                <button
                  type="button"
                  onClick={submitCheckpointAnswer}
                  disabled={submitting}
                  className="mt-5 w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Đang nộp…" : "Nộp câu trả lời"}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">Đang tải câu hỏi…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
