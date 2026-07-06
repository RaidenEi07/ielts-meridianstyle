"use client";

import { Lightbulb } from "lucide-react";
import { QUESTION_GUIDES } from "@/lib/questionGuides";

export function QuestionTypeGuide({ type }: { type: string }) {
  const guide = QUESTION_GUIDES[type];
  if (!guide) return null;

  return (
    <div
      key={type}
      className="animate-fade-slide-in rounded-card border border-border bg-primary-soft p-5"
    >
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
        <Lightbulb className="h-4 w-4" /> Hướng dẫn: {guide.title}
      </p>
      <p className="mb-3 text-sm text-text">{guide.purpose}</p>
      <ol className="mb-3 list-decimal space-y-1.5 pl-4 text-sm text-text">
        {guide.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {guide.example && (
        <p className="rounded-lg bg-surface p-2.5 text-xs text-muted">
          <span className="font-semibold">Ví dụ:</span> {guide.example}
        </p>
      )}
    </div>
  );
}
