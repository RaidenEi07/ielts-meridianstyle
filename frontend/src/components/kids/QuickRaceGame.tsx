"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, gameApi } from "@/lib/api";
import { playCorrectSound, playIncorrectSound } from "@/lib/kidsFeedback";

const TIME_PER_QUESTION = 15;
const POINTS_PER_CORRECT = 10;

type Phase = "question" | "feedback";

export function QuickRaceGame({
  categoryId,
  token,
  onComplete,
}: {
  categoryId: number | null;
  token: string;
  onComplete: (pointsEarned: number) => void;
}) {
  const [questions, setQuestions] = useState<
    { questionId: number; stem: string; options: { id: number; content: string }[] }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    gameApi
      .raceRound(token, categoryId ?? undefined, 8)
      .then((qs) => {
        if (qs.length === 0) {
          setError("Chưa có câu hỏi cho danh mục này.");
          setQuestions([]);
          return;
        }
        setQuestions(qs);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được lượt chơi"));
  }, [categoryId, token]);

  async function handleAnswer(optionId: number | null) {
    if (phase !== "question") return;
    setSelectedId(optionId);
    setPhase("feedback");
    try {
      const result = await gameApi.checkRaceAnswer(
        token,
        questions![currentIndex].questionId,
        optionId,
      );
      setFeedback(result.correct);
      if (result.correct) {
        setCorrectCount((c) => c + 1);
        playCorrectSound();
      } else {
        playIncorrectSound();
      }
    } catch {
      setFeedback(false);
    }
  }

  useEffect(() => {
    if (!questions || phase !== "question" || currentIndex >= questions.length) return;
    const timer = setTimeout(() => {
      if (timeLeft <= 1) {
        handleAnswer(null);
      } else {
        setTimeLeft((t) => t - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, currentIndex, questions]);

  useEffect(() => {
    if (phase !== "feedback") return;
    const timer = setTimeout(() => {
      if (!questions) return;
      const next = currentIndex + 1;
      if (next >= questions.length) {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const points = correctCount * POINTS_PER_CORRECT;
        gameApi
          .awardPoints(token, points, "Hoàn thành lượt Đua trả lời nhanh", "quick_race")
          .catch(() => {})
          .finally(() => onComplete(points));
      } else {
        setCurrentIndex(next);
        setSelectedId(null);
        setFeedback(null);
        setTimeLeft(TIME_PER_QUESTION);
        setPhase("question");
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (error && (!questions || questions.length === 0)) {
    return <p className="text-sm text-red">{error}</p>;
  }

  if (!questions) {
    return <p className="text-sm text-muted">Đang tải lượt chơi…</p>;
  }

  const question = questions[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Câu {currentIndex + 1}/{questions.length}
        </span>
        <span className={`font-semibold ${timeLeft <= 5 ? "text-red" : "text-muted"}`}>
          ⏱ {timeLeft}s
        </span>
      </div>

      <p className="text-lg font-semibold">{question.stem}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const showFeedback = phase === "feedback" && isSelected;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleAnswer(opt.id)}
              disabled={phase !== "question"}
              className={`rounded-xl border-2 p-4 text-left text-base font-medium transition-colors ${
                showFeedback
                  ? feedback
                    ? "animate-bubble-pop border-primary bg-primary-soft"
                    : "animate-kids-shake border-red bg-red-soft"
                  : "border-border bg-surface hover:bg-soft"
              }`}
            >
              {opt.content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
