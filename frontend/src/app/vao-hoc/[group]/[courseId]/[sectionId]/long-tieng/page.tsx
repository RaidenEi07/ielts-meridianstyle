"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CharacterDubbingRecorder } from "@/components/kids/CharacterDubbingRecorder";
import { ApiError, catalogApi, dubbingApi } from "@/lib/api";
import { computeDubWindows, exportDubbedVideo } from "@/lib/dubbingExport";
import type { CourseDetail, DubbingCharacter, DubbingRecording } from "@/lib/types";
import { isYoutubeUrl } from "@/lib/youtube";
import { useAuthStore } from "@/store/auth";

export default function CharacterDubbingPage() {
  const params = useParams<{ group: string; courseId: string; sectionId: string }>();
  const courseId = Number(params.courseId);
  const sectionId = Number(params.sectionId);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [characters, setCharacters] = useState<DubbingCharacter[] | null>(null);
  const [recordings, setRecordings] = useState<DubbingRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportStage, setExportStage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    catalogApi.course(courseId).then(setCourse).catch(() => {});
  }, [courseId]);

  function loadCharacters() {
    if (!ready || !accessToken) return;
    dubbingApi
      .characters(accessToken, sectionId)
      .then(setCharacters)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được nhân vật"));
  }

  function loadRecordings() {
    if (!ready || !accessToken) return;
    dubbingApi
      .myRecordings(accessToken, sectionId)
      .then(setRecordings)
      .catch(() => {});
  }

  useEffect(() => {
    loadCharacters();
    loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, accessToken, sectionId]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  const section = course?.sections.find((s) => s.id === sectionId);
  const isYoutube = section?.videoUrl ? isYoutubeUrl(section.videoUrl) : false;

  async function handleExport() {
    if (!section?.videoUrl || !characters) return;
    setExportError(null);
    setExportDone(false);
    try {
      const windows = computeDubWindows(characters, recordings);
      const blob = await exportDubbedVideo(section.videoUrl, windows, setExportStage);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `long-tieng-${section.title ?? "video"}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Xuất video thất bại");
    } finally {
      setExportStage(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader
        title="🎭 Lồng tiếng nhân vật"
        backHref={`/vao-hoc/${params.group}/${courseId}/${sectionId}`}
        backLabel={section?.title ?? "Buổi học"}
      />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-muted">
          Chọn nhân vật muốn lồng tiếng, ghi âm giọng của bé để thay cho giọng gốc.
        </p>

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        {isYoutube ? (
          <p className="mt-6 rounded-lg border border-border bg-surface p-6 text-center text-muted">
            Buổi học này dùng video YouTube, chưa hỗ trợ lồng tiếng.
          </p>
        ) : (
          <>
            {section?.videoUrl && (
              <div className="mt-4">
                <video
                  src={section.videoUrl}
                  controls
                  className="w-full rounded-lg border border-border"
                />
              </div>
            )}

            {accessToken && characters && characters.length === 0 && (
              <p className="mt-6 rounded-lg border border-border bg-surface p-6 text-center text-muted">
                Buổi học này chưa có lồng tiếng nhân vật.
              </p>
            )}

            {accessToken && characters && characters.length > 0 && (
              <div className="mt-6 space-y-3">
                {characters.map((c) => (
                  <CharacterDubbingRecorder
                    key={c.id}
                    character={c}
                    token={accessToken}
                    recordings={recordings}
                    onChange={loadRecordings}
                  />
                ))}
              </div>
            )}

            {accessToken && recordings.length > 0 && (
              <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-center">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportStage !== null}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {exportStage ?? "🎬 Xuất video"}
                </button>
                {exportDone && <p className="mt-2 text-sm text-green">🎉 Đã xuất video!</p>}
                {exportError && <p className="mt-2 text-sm text-red">{exportError}</p>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
