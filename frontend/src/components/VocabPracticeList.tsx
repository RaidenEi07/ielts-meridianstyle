"use client";

import { useEffect, useState } from "react";
import { vocabApi } from "@/lib/api";
import type { VocabSetSummary } from "@/lib/types";
import { VocabSetPlayer } from "./VocabSetPlayer";

/** Danh sách bộ thẻ luyện từ vựng/phát âm gắn vào 1 section — ẩn hẳn nếu
 * section chưa có bộ thẻ nào, cùng quy ước với HomeworkMaterialsList. */
export function VocabPracticeList({ sectionId, token }: { sectionId: number; token: string }) {
  const [sets, setSets] = useState<VocabSetSummary[]>([]);
  const [openSetId, setOpenSetId] = useState<number | null>(null);

  useEffect(() => {
    vocabApi
      .listSets(sectionId, token)
      .then(setSets)
      .catch(() => setSets([]));
  }, [sectionId, token]);

  if (sets.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">🗣️ Luyện từ vựng & phát âm</h2>
      <div className="mt-3 space-y-2">
        {sets.map((s) => {
          const open = openSetId === s.id;
          return (
            <div key={s.id} className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setOpenSetId(open ? null : s.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-muted">{s.cardCount} thẻ</span>
              </button>
              {open && (
                <div className="border-t border-border p-4">
                  <VocabSetPlayer setId={s.id} token={token} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
