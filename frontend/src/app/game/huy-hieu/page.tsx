"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, gameApi } from "@/lib/api";
import type { Badge } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function BadgesPage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [badges, setBadges] = useState<Badge[] | null>(null);
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
      .badges(accessToken)
      .then(setBadges)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được huy hiệu"));
  }, [ready, accessToken]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="🏅 Huy hiệu của tôi" backHref="/vao-hoc/tieu-hoc" backLabel="Tiểu học" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}

        {!badges ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.code}
                className={`relative rounded-xl border-2 p-4 text-center transition-colors ${
                  b.earned
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-surface opacity-50"
                }`}
              >
                {!b.earned && <span className="absolute right-2 top-2 text-sm">🔒</span>}
                <p className="text-4xl">{b.emoji}</p>
                <p className="mt-2 font-semibold">{b.name}</p>
                <p className="mt-1 text-xs text-muted">{b.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
