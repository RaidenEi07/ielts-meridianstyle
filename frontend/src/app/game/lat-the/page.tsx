"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MemoryFlipGame } from "@/components/kids/MemoryFlipGame";
import { ApiError, gameApi } from "@/lib/api";
import type { QuestionCategoryNode } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

export default function MemoryFlipGamePage() {
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);

  const [categories, setCategories] = useState<QuestionCategoryNode[] | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

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
      .categories(accessToken)
      .then(setCategories)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được danh mục"));
  }, [ready, accessToken]);

  function playAgain() {
    setPointsEarned(null);
    setRound((r) => r + 1);
  }

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="🎮 Lật thẻ ghi nhớ" backHref="/vao-hoc/tieu-hoc" backLabel="Tiểu học" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-muted">
          Lật 2 thẻ mỗi lượt, tìm cặp từ khớp với hình. Ghép hết tất cả các cặp để nhận điểm thưởng!
        </p>

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        {categories && categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                categoryId === null ? "bg-primary text-white" : "border border-border text-muted"
              }`}
            >
              Tất cả
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  categoryId === c.id ? "bg-primary text-white" : "border border-border text-muted"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {accessToken && (
          <div className="mt-6">
            {pointsEarned !== null ? (
              <div className="rounded-xl border border-primary bg-primary-soft p-8 text-center">
                <p className="text-2xl font-bold">🎉 Hoàn thành!</p>
                <p className="mt-2 text-lg">Bạn nhận được {pointsEarned} điểm</p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={playAgain}
                    className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white"
                  >
                    Chơi lại
                  </button>
                  <Link
                    href="/game/bang-xep-hang"
                    className="rounded-lg border border-border px-5 py-2.5 font-semibold text-muted hover:text-text"
                  >
                    Xem bảng xếp hạng
                  </Link>
                </div>
              </div>
            ) : (
              <MemoryFlipGame
                key={`${categoryId}-${round}`}
                categoryId={categoryId}
                token={accessToken}
                onComplete={setPointsEarned}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
