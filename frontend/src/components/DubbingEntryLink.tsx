"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dubbingApi } from "@/lib/api";
import { isYoutubeUrl } from "@/lib/youtube";

export function DubbingEntryLink({
  sectionId,
  token,
  href,
  videoUrl,
}: {
  sectionId: number;
  token: string;
  href: string;
  videoUrl?: string | null;
}) {
  const [hasCharacters, setHasCharacters] = useState(false);

  useEffect(() => {
    dubbingApi
      .characters(token, sectionId)
      .then((chars) => setHasCharacters(chars.length > 0))
      .catch(() => setHasCharacters(false));
  }, [sectionId, token]);

  if (!hasCharacters) return null;
  if (videoUrl && isYoutubeUrl(videoUrl)) return null;

  return (
    <Link
      href={href}
      className="mt-6 flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-[0_12px_36px_-14px_rgba(38,33,27,.13)]"
    >
      <div>
        <p className="font-semibold">🎭 Lồng tiếng nhân vật</p>
        <p className="mt-1 text-sm text-muted">Ghi âm giọng của bé thay cho nhân vật trong video.</p>
      </div>
      <span className="text-2xl">→</span>
    </Link>
  );
}
