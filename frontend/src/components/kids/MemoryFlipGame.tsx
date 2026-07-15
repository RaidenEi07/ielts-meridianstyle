"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, gameApi } from "@/lib/api";
import { playCorrectSound, playIncorrectSound } from "@/lib/kidsFeedback";

const POINTS_PER_PAIR = 10;

type Card = {
  cardId: string;
  pairId: number;
  kind: "word" | "image";
  content: string;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function MemoryFlipGame({
  categoryId,
  token,
  onComplete,
}: {
  categoryId: number | null;
  token: string;
  onComplete: (pointsEarned: number) => void;
}) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [totalPairs, setTotalPairs] = useState(0);
  const busy = flipped.length === 2;
  const awardedRef = useRef(false);

  // Component được mount lại hoàn toàn qua `key` (categoryId/round) ở component
  // cha mỗi khi bắt đầu lượt mới — không cần tự reset state ở đây.
  useEffect(() => {
    gameApi
      .memoryRound(token, categoryId ?? undefined, 6)
      .then((pairs) => {
        if (pairs.length === 0) {
          setError("Chưa có nội dung cho danh mục này.");
          setCards([]);
          return;
        }
        const built: Card[] = pairs.flatMap((p) => [
          { cardId: `${p.pairId}-word`, pairId: p.pairId, kind: "word" as const, content: p.word },
          {
            cardId: `${p.pairId}-image`,
            pairId: p.pairId,
            kind: "image" as const,
            content: p.imageUrl ?? p.word,
          },
        ]);
        setTotalPairs(pairs.length);
        setCards(shuffle(built));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được lượt chơi"));
  }, [categoryId, token]);

  useEffect(() => {
    if (!busy || !cards) return;
    const [aId, bId] = flipped;
    const a = cards.find((c) => c.cardId === aId)!;
    const b = cards.find((c) => c.cardId === bId)!;
    const timer = setTimeout(() => {
      if (a.pairId === b.pairId) {
        playCorrectSound();
        setMatchedPairs((prev) => new Set(prev).add(a.pairId));
      } else {
        playIncorrectSound();
      }
      setFlipped([]);
    }, 700);
    return () => clearTimeout(timer);
  }, [busy, flipped, cards]);

  useEffect(() => {
    if (totalPairs === 0 || awardedRef.current) return;
    if (matchedPairs.size === totalPairs) {
      awardedRef.current = true;
      const points = totalPairs * POINTS_PER_PAIR;
      gameApi
        .awardPoints(token, points, "Hoàn thành lượt Lật thẻ ghi nhớ", "memory_match")
        .catch(() => {})
        .finally(() => onComplete(points));
    }
  }, [matchedPairs, totalPairs, token, onComplete]);

  function handleFlip(card: Card) {
    if (busy || flipped.includes(card.cardId) || matchedPairs.has(card.pairId)) return;
    if (flipped.length >= 2) return;
    setFlipped((prev) => [...prev, card.cardId]);
  }

  if (error && (!cards || cards.length === 0)) {
    return <p className="text-sm text-red">{error}</p>;
  }

  if (!cards) {
    return <p className="text-sm text-muted">Đang tải lượt chơi…</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const isFlipped = flipped.includes(card.cardId) || matchedPairs.has(card.pairId);
        const isMatched = matchedPairs.has(card.pairId);
        return (
          <button
            key={card.cardId}
            type="button"
            onClick={() => handleFlip(card)}
            disabled={isMatched}
            className={`flex h-24 items-center justify-center rounded-xl border-2 p-2 text-center transition-colors sm:h-28 ${
              isMatched
                ? "animate-bubble-pop border-primary bg-primary-soft"
                : isFlipped
                  ? "border-border bg-surface"
                  : "border-border bg-soft hover:bg-primary-soft"
            }`}
          >
            {isFlipped ? (
              card.kind === "image" && card.content.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.content} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <span className="text-sm font-semibold">{card.content}</span>
              )
            ) : (
              <span className="text-3xl">❓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
