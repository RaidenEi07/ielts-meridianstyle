"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, gameApi } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function LeaderboardPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!ready || !accessToken) return;
    gameApi
      .leaderboard(accessToken, 10)
      .then(setEntries)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được bảng xếp hạng"));
  }, [ready, accessToken]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="🏆 Bảng xếp hạng" backHref="/game/lat-the" backLabel="Lật thẻ ghi nhớ" />

      <main className="mx-auto max-w-2xl px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}

        {!entries ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted">
            Chưa có ai chơi game — hãy là người đầu tiên!
          </p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li
                key={`${e.fullName}-${i}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                  <span className="font-medium">{e.fullName}</span>
                </div>
                <span className="font-semibold text-primary">{e.totalPoints} điểm</span>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
