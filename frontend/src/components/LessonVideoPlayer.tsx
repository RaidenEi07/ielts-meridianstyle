"use client";

import { useEffect, useRef, useState } from "react";
import { isYoutubeUrl, toYoutubeEmbedUrl } from "@/lib/youtube";
import { parseVtt, type VttCue } from "./VttParser";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LessonVideoPlayer({
  videoUrl,
  subtitleUrl,
}: {
  videoUrl: string;
  subtitleUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cues, setCues] = useState<VttCue[]>([]);
  const isYoutube = isYoutubeUrl(videoUrl);

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
      <video
        ref={videoRef}
        controls
        src={videoUrl}
        className="w-full rounded-xl border border-border bg-black"
      >
        {subtitleUrl && (
          <track kind="subtitles" src={subtitleUrl} srcLang="vi" label="Tiếng Việt" default />
        )}
      </video>

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
    </div>
  );
}
