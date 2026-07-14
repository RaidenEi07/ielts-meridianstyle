"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  Highlighter,
  Hourglass,
  Lightbulb,
  Lock,
  NotebookPen,
  Pause,
  Play,
  Timer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HtmlWithBlanks } from "@/components/HtmlWithBlanks";
import { KidsDragDropSentence } from "@/components/kids/KidsDragDropSentence";
import { KidsMatchingGame } from "@/components/kids/KidsMatchingGame";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { quizApi } from "@/lib/api";
import { playCorrectSound, playIncorrectSound } from "@/lib/kidsFeedback";
import type {
  AttemptPlayer,
  AttemptResult,
  ExamPage,
  PlayerQuestion,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Render HTML imperatively (không dùng dangerouslySetInnerHTML) để nội dung
 * KHÔNG bị React reset khi component cha re-render vì lý do khác (vd: mở popup
 * highlight/ghi chú) — nếu không, highlight/mark chèn thủ công sẽ bị mất gốc
 * ngay khi người dùng bấm nút trong popup. Cùng nguyên lý đã dùng ở HtmlWithBlanks.tsx.
 */
function useImperativeHtml(html: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const temp = document.createElement("div");
    temp.innerHTML = html;
    container.replaceChildren(...temp.childNodes);
  }, [html]);
  return ref;
}

type Step =
  | { kind: "reading"; key: string; label: string; page: ExamPage; questions: PlayerQuestion[] }
  | { kind: "listening"; key: string; label: string; page: ExamPage; questions: PlayerQuestion[] }
  | { kind: "standalone"; key: string; label: string; questions: PlayerQuestion[] }
  | { kind: "essay"; key: string; label: string; question: PlayerQuestion };

/**
 * Một "slot" đánh số trong navigator: hầu hết câu hỏi = 1 slot, nhưng CLOZE có
 * nhiều chỗ trống thì mỗi chỗ trống là 1 slot riêng (đúng quy ước IELTS thật,
 * vd "Questions 4-9" = 6 chỗ trống được đánh số độc lập, không phải 1 câu).
 */
interface Slot {
  key: string;
  quizQuestionId: number;
  subIndex?: number;
}

function expandSlots(q: PlayerQuestion): Slot[] {
  if (q.type === "CLOZE" && q.clozeSubAnswers.length > 0) {
    return [...q.clozeSubAnswers]
      .sort((a, b) => a.subIndex - b.subIndex)
      .map((c) => ({
        key: `${q.quizQuestionId}:${c.subIndex}`,
        quizQuestionId: q.quizQuestionId,
        subIndex: c.subIndex,
      }));
  }
  return [{ key: `${q.quizQuestionId}`, quizQuestionId: q.quizQuestionId }];
}

function stepSlots(step: Step): Slot[] {
  switch (step.kind) {
    case "essay":
      return expandSlots(step.question);
    default:
      return step.questions.flatMap(expandSlots);
  }
}

function isSlotAnswered(slot: Slot, answers: Record<number, unknown>): boolean {
  const answer = answers[slot.quizQuestionId] as { subs?: Record<string, string> } | undefined;
  if (slot.subIndex != null) {
    const v = answer?.subs?.[String(slot.subIndex)];
    return Boolean(v && v.trim());
  }
  return answer != null;
}

/** Nhãn số hiển thị trên thẻ câu hỏi: 1 số bình thường, hoặc dải số "4-6" cho CLOZE nhiều chỗ trống. */
function cardLabel(q: PlayerQuestion, order: Map<string, number>): string {
  if (q.type === "CLOZE" && q.clozeSubAnswers.length > 0) {
    const nums = q.clozeSubAnswers
      .map((c) => order.get(`${q.quizQuestionId}:${c.subIndex}`))
      .filter((n): n is number => n != null);
    if (nums.length === 0) return "";
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return min === max ? `${min}` : `${min}-${max}`;
  }
  return String(order.get(`${q.quizQuestionId}`) ?? "");
}

/** So sánh focusId (slot key, có thể là "66" hoặc "66:2") với 1 quizQuestionId. */
function isFocusedQuestion(focusId: string | null, quizQuestionId: number): boolean {
  if (focusId == null) return false;
  return Number(focusId.split(":")[0]) === quizQuestionId;
}

interface Note {
  id: string;
  text: string;
  createdAt: number;
  /** Nếu ghi chú được tạo từ việc bôi đen văn bản: id của <mark> tương ứng + step chứa nó. */
  markId?: string;
  stepKey?: string;
}

function unwrapMark(mark: Element) {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
}

function flashMark(el: HTMLElement) {
  const prevShadow = el.style.boxShadow;
  const prevTransition = el.style.transition;
  el.style.transition = "box-shadow 0.2s ease";
  el.style.boxShadow = "0 0 0 4px var(--accent)";
  setTimeout(() => {
    el.style.boxShadow = prevShadow;
    el.style.transition = prevTransition;
  }, 1600);
}

export default function QuizPlayerPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const router = useRouter();
  const { accessToken, hydrated } = useAuthStore();

  const [attempt, setAttempt] = useState<AttemptPlayer | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [resultQuestions, setResultQuestions] = useState<PlayerQuestion[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const submittingRef = useRef(false);
  const token = accessToken ?? "";

  // Ghi chú lưu theo attempt, tồn tại qua reload (không gửi lên server).
  useEffect(() => {
    if (!attemptId) return;
    try {
      const raw = localStorage.getItem(`meridian-quiz-notes-${attemptId}`);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    try {
      localStorage.setItem(`meridian-quiz-notes-${attemptId}`, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [attemptId, notes]);

  function addNote(text: string, markId?: string, stepKey?: string) {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: `${Date.now()}-${Math.random()}`, text: text.trim(), createdAt: Date.now(), markId, stepKey },
      ...prev,
    ]);
  }
  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }
  const [pendingMarkFocus, setPendingMarkFocus] = useState<string | null>(null);

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const r = await quizApi.submit(attemptId, token);
      setResultQuestions(attempt?.questions ?? []);
      setResult(r);
      setAttempt(null);
    } catch {
      submittingRef.current = false;
    }
  }, [attemptId, token, attempt]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    quizApi
      .getAttempt(attemptId, token)
      .then((a) => {
        if (a.status !== "IN_PROGRESS") {
          setResultQuestions(a.questions ?? []);
          return quizApi.result(attemptId, token).then(setResult);
        }
        setAttempt(a);
        setAnswers(a.savedAnswers ?? {});
        setViolations(a.violations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken, attemptId]);

  // Timer
  useEffect(() => {
    if (!attempt?.deadlineAt) return;
    const deadline = new Date(attempt.deadlineAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [attempt?.deadlineAt, doSubmit]);

  // Anti-cheat
  useEffect(() => {
    if (!attempt || !attempt.antiCheatEnabled) return;
    let lastLog = 0;
    const report = async () => {
      const now = Date.now();
      if (now - lastLog < 800) return;
      lastLog = now;
      try {
        const res = await quizApi.logEvent(attemptId, "TAB_SWITCH", "rời khỏi bài thi", token);
        setViolations(res.violations);
        setToast(`⚠ Cảnh báo chuyển tab (${res.violations}/${attempt.maxViolations})`);
        setTimeout(() => setToast(null), 3000);
        if (res.autoSubmitted) doSubmit();
      } catch {
        /* ignore */
      }
    };
    const onVis = () => document.hidden && report();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", report);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", report);
    };
  }, [attempt, attemptId, token, doSubmit]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setAnswer = useCallback((q: PlayerQuestion, response: any) => {
    setAnswers((prev) => ({ ...prev, [q.quizQuestionId]: response }));
    quizApi.saveAnswer(attemptId, q.quizQuestionId, response, token).catch(() => {});
  }, [attemptId, token]);

  const toggleFlag = useCallback((id: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Mỗi Part (reading/listening), nhóm câu-không-passage, và mỗi Essay là 1 "trang" riêng.
  const steps: Step[] = useMemo(() => {
    if (!attempt) return [];
    const readingPages = attempt.pages
      .filter((p) => p.passageKind === "READING")
      .sort((a, b) => a.pageNumber - b.pageNumber);
    const listeningPages = attempt.pages
      .filter((p) => p.passageKind === "LISTENING")
      .sort((a, b) => a.pageNumber - b.pageNumber);
    const passagePageIds = new Set([...readingPages, ...listeningPages].map((p) => p.id));
    const questionsForPage = (pageId: number) =>
      attempt.questions.filter((q) => q.pageId === pageId && q.type !== "ESSAY");
    const essayQuestions = attempt.questions.filter((q) => q.type === "ESSAY");
    const standalone = attempt.questions.filter(
      (q) => q.type !== "ESSAY" && !(q.pageId != null && passagePageIds.has(q.pageId)),
    );

    const list: Step[] = [];
    readingPages.forEach((page) =>
      list.push({
        kind: "reading",
        key: `page-${page.id}`,
        label: page.partLabel ?? `Part ${page.pageNumber}`,
        page,
        questions: questionsForPage(page.id),
      }),
    );
    listeningPages.forEach((page) =>
      list.push({
        kind: "listening",
        key: `page-${page.id}`,
        label: page.partLabel ?? `Part ${page.pageNumber}`,
        page,
        questions: questionsForPage(page.id),
      }),
    );
    if (standalone.length > 0) {
      list.push({ kind: "standalone", key: "standalone", label: "Câu hỏi khác", questions: standalone });
    }
    essayQuestions.forEach((q, i) =>
      list.push({
        kind: "essay",
        key: `essay-${q.quizQuestionId}`,
        label: essayQuestions.length > 1 ? `Writing Task ${i + 1}` : "Writing Task",
        question: q,
      }),
    );
    return list;
  }, [attempt]);

  // Audio Listening dùng CHUNG cho mọi Part (3 Part cùng 1 file) — 1 <audio>
  // duy nhất ở cấp cao nhất, phát liên tục xuyên suốt kể cả khi đổi Part, và
  // KHÔNG cho tạm dừng một khi đã bấm phát (đúng chuẩn thi IELTS CD).
  const audioSrc = useMemo(() => {
    const listeningStep = steps.find((s) => s.kind === "listening");
    return listeningStep?.kind === "listening" ? listeningStep.page.passageAudioUrl : null;
  }, [steps]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioCurrent, setAudioCurrent] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioEnded, setAudioEnded] = useState(false);
  const [audioTransferLeft, setAudioTransferLeft] = useState<number | null>(null);
  const maxAudioReachedRef = useRef(0);

  useEffect(() => {
    if (!audioEnded) return;
    setAudioTransferLeft(TRANSFER_TIME_SECONDS);
    const iv = setInterval(() => {
      setAudioTransferLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [audioEnded]);

  const startAudio = useCallback(() => {
    if (audioStarted) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
    setAudioStarted(true);
  }, [audioStarted]);

  // Số thứ tự câu toàn bài (cho navigator) + tra cứu câu -> step chứa nó.
  const orderedSlots = useMemo(() => steps.flatMap(stepSlots), [steps]);

  const order = useMemo(() => {
    const m = new Map<string, number>();
    orderedSlots.forEach((s, i) => m.set(s.key, i + 1));
    return m;
  }, [orderedSlots]);

  const questionStepIndex = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((step, idx) => stepSlots(step).forEach((s) => m.set(s.quizQuestionId, idx)));
    return m;
  }, [steps]);

  const focusNoteMark = useCallback(
    (note: Note) => {
      if (!note.markId) return;
      if (note.stepKey) {
        const idx = steps.findIndex((s) => s.key === note.stepKey);
        if (idx >= 0) setStepIndex(idx);
      }
      setPendingMarkFocus(note.markId);
    },
    [steps],
  );

  // Nhảy tới highlight tương ứng của ghi chú sau khi (nếu cần) chuyển đúng step chứa nó.
  useEffect(() => {
    if (!pendingMarkFocus) return;
    const el = document.getElementById(pendingMarkFocus);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      flashMark(el);
    }
    setPendingMarkFocus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMarkFocus, stepIndex]);

  const goToQuestion = useCallback(
    (slotKey: string) => {
      const quizQuestionId = Number(slotKey.split(":")[0]);
      const idx = questionStepIndex.get(quizQuestionId);
      if (idx != null) setStepIndex(idx);
      setFocusId(slotKey);
    },
    [questionStepIndex],
  );

  const stepBy = useCallback(
    (delta: number) => {
      if (orderedSlots.length === 0) return;
      const curKey = focusId ?? orderedSlots[0].key;
      const idx = orderedSlots.findIndex((s) => s.key === curKey);
      const nextIdx = Math.min(orderedSlots.length - 1, Math.max(0, idx + delta));
      goToQuestion(orderedSlots[nextIdx].key);
    },
    [orderedSlots, focusId, goToQuestion],
  );

  // Focus câu đầu tiên khi bài load xong.
  useEffect(() => {
    if (focusId == null && orderedSlots.length > 0) {
      setFocusId(orderedSlots[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedSlots]);

  // Cuộn tới câu (hoặc chỗ trống CLOZE cụ thể) đang được focus sau khi chuyển trang/chuyển câu.
  useEffect(() => {
    if (focusId == null) return;
    const [qid, subIndex] = focusId.split(":");
    const domId = subIndex ? `blank-${qid}-${subIndex}` : `q-${qid}`;
    const el = document.getElementById(domId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, stepIndex]);

  if (loading || !hydrated) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }
  if (result) return <ResultView result={result} questions={resultQuestions} />;
  if (!attempt) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Không tải được bài làm.{" "}
        <Link href="/dashboard" className="text-accent">Về bảng điều khiển</Link>
      </div>
    );
  }

  const answeredCount = orderedSlots.filter((s) => isSlotAnswered(s, answers)).length;

  return (
    <div
      className="flex min-h-screen flex-col bg-bg pb-16"
      onCopy={(e) => attempt.antiCheatEnabled && e.preventDefault()}
      onPaste={(e) => attempt.antiCheatEnabled && e.preventDefault()}
      onContextMenu={(e) => attempt.antiCheatEnabled && e.preventDefault()}
    >
      {/*
        Audio Listening dùng chung cho cả 3 Part — 1 thẻ <audio> duy nhất,
        mount xuyên suốt vòng đời trang (không nằm trong step nào) nên tiếp
        tục phát kể cả khi người dùng chuyển sang Part/Reading/Essay khác.
      */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          controls={false}
          onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            if (t > maxAudioReachedRef.current + 1.5) {
              e.currentTarget.currentTime = maxAudioReachedRef.current;
              return;
            }
            maxAudioReachedRef.current = Math.max(maxAudioReachedRef.current, t);
            setAudioCurrent(t);
          }}
          onEnded={() => setAudioEnded(true)}
        />
      )}

      {/* Header phòng thi */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
        style={{ background: "#262019", color: "#ECE4D8" }}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{attempt.quizTitle}</span>
          {attempt.examTemplateCode && (
            <span className="rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-white">
              {attempt.examTemplateCode}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-white/50">
            <Lock className="h-3.5 w-3.5" /> Chế độ thi
          </span>
        </div>
        <div className="flex items-center gap-4">
          {attempt.antiCheatEnabled && (
            <span className="text-xs text-white/60">
              Vi phạm: {violations}/{attempt.maxViolations}
            </span>
          )}
          {remaining !== null && (
            <span className={`flex items-center gap-1 font-mono text-lg ${remaining < 60 ? "text-red" : ""}`}
              style={{ fontFamily: "var(--font-mono)" }}>
              <Timer className="h-4 w-4" /> {fmt(remaining)}
            </span>
          )}
          <button type="button" onClick={doSubmit}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
            Nộp bài
          </button>
        </div>
      </header>

      {/*
        Mỗi Part được mount SUỐT vòng đời bài thi, chỉ ẩn/hiện bằng CSS (không
        conditional-render) — nếu unmount khi chuyển Part, mọi highlight/mark đã
        chèn thủ công vào DOM (không nằm trong state React) sẽ mất khi quay lại.
      */}
      <div className="flex-1">
        {steps.map((step, idx) => {
          const isActive = idx === stepIndex;
          return (
            <div key={step.key} className={isActive ? "" : "hidden"}>
              {step.kind === "reading" && (
                <ReadingSplitPane
                  page={step.page}
                  questions={step.questions}
                  order={order}
                  answers={answers}
                  flagged={flagged}
                  focusedId={focusId}
                  onAnswer={setAnswer}
                  onFlag={toggleFlag}
                  onCaptureNote={addNote}
                />
              )}
              {step.kind === "listening" && (
                <ListeningPane
                  page={step.page}
                  questions={step.questions}
                  order={order}
                  answers={answers}
                  flagged={flagged}
                  focusedId={focusId}
                  onAnswer={setAnswer}
                  onFlag={toggleFlag}
                  started={audioStarted}
                  current={audioCurrent}
                  duration={audioDuration}
                  ended={audioEnded}
                  transferLeft={audioTransferLeft}
                  onStart={startAudio}
                />
              )}
              {step.kind === "standalone" && (
                <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
                  {step.questions.map((q) => (
                    <QuestionCard key={q.quizQuestionId} index={cardLabel(q, order)}
                      question={q} answer={answers[q.quizQuestionId]} flagged={flagged.has(q.quizQuestionId)}
                      order={order}
                      focused={isFocusedQuestion(focusId, q.quizQuestionId)}
                      onChange={(r) => setAnswer(q, r)} onFlag={() => toggleFlag(q.quizQuestionId)} />
                  ))}
                </div>
              )}
              {step.kind === "essay" && (
                <WritingEditor index={order.get(`${step.question.quizQuestionId}`)!}
                  question={step.question} value={answers[step.question.quizQuestionId]?.text ?? ""}
                  onChange={(text) => setAnswer(step.question, { text })} />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom navigator: nhóm theo Part, bấm số nào nhảy đúng tới câu đó */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-4 py-2.5">
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto">
          <span className="shrink-0 text-xs text-muted">
            {answeredCount}/{orderedSlots.length} câu
          </span>
          <div className="flex items-center gap-3">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex shrink-0 items-center gap-1.5">
                {idx > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-border" />}
                {stepSlots(step).map((slot) => {
                  const answered = isSlotAnswered(slot, answers);
                  const isFlagged = flagged.has(slot.quizQuestionId);
                  const isCurrent = focusId === slot.key;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => goToQuestion(slot.key)}
                      title={`Câu ${order.get(slot.key)} — ${step.label}`}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-transform ${
                        isCurrent ? "ring-2 ring-primary ring-offset-1 ring-offset-surface" : ""
                      } ${
                        isFlagged ? "border-accent bg-accent-soft text-accent"
                          : answered ? "border-green bg-green-soft text-green"
                          : "border-border text-muted"}`}>
                      {order.get(slot.key)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Ghi chú + điều hướng câu tiếp theo/trước đó, góc dưới bên phải */}
      <div className="fixed bottom-20 right-6 z-30 flex flex-col items-end gap-2">
        {notesOpen && (
          <NotesPanel
            notes={notes}
            onAdd={addNote}
            onRemove={removeNote}
            onJump={focusNoteMark}
            onClose={() => setNotesOpen(false)}
          />
        )}
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          title="Ghi chú"
          className={`relative grid h-11 w-11 place-items-center rounded-full border shadow-md ${
            notesOpen ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted"
          }`}
        >
          <NotebookPen className="h-5 w-5" />
          {notes.length > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">
              {notes.length}
            </span>
          )}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => stepBy(-1)} title="Câu trước"
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface shadow-md hover:bg-primary-soft">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => stepBy(1)} title="Câu tiếp theo"
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface shadow-md hover:bg-primary-soft">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-40 right-6 z-30 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
          style={{ background: "#3a2220" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Ghi chú trong lúc làm bài (client-side, lưu localStorage theo attempt)
// ------------------------------------------------------------------
function NotesPanel({
  notes, onAdd, onRemove, onJump, onClose,
}: {
  notes: Note[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  onJump: (note: Note) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  function submit() {
    onAdd(draft);
    setDraft("");
  }
  return (
    <div className="flex w-80 flex-col rounded-card border border-border bg-surface p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Ghi chú của tôi</span>
        <button type="button" onClick={onClose} className="text-muted hover:text-red">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ghi chú nhanh…"
          rows={2}
          className="input flex-1 resize-none text-sm"
        />
        <button type="button" onClick={submit}
          className="shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-white">
          Thêm
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-muted">Chưa có ghi chú nào.</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => n.markId && onJump(n)}
              title={n.markId ? "Bấm để xem vị trí highlight" : undefined}
              className={`flex items-start gap-2 rounded-lg bg-bg px-2.5 py-1.5 text-sm ${
                n.markId ? "cursor-pointer hover:bg-accent-soft" : ""
              }`}
            >
              {n.markId && <Highlighter className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
              <span className="flex-1 whitespace-pre-wrap break-words">{n.text}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(n.id);
                }}
                title="Xóa ghi chú"
                className="shrink-0 text-faint hover:text-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Bôi đen văn bản (passage hoặc phần câu hỏi) -> hỏi Highlight hay Ghi chú
// ------------------------------------------------------------------
interface SelectionMenuState {
  x: number;
  y: number;
}

function useSelectionCapture(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onCaptureNote: (text: string, markId: string) => void,
) {
  const [menu, setMenu] = useState<SelectionMenuState | null>(null);
  const rangeRef = useRef<Range | null>(null);

  function handleMouseUp(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const existingMark = target.closest("mark");
    if (existingMark && containerRef.current?.contains(existingMark)) {
      unwrapMark(existingMark);
      setMenu(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer) || !range.toString().trim()) {
      return;
    }
    // Chỉ cho phép highlight/ghi chú trong vùng văn bản đã đánh dấu an toàn
    // (passage/stem, render imperatively) — tránh chèn <mark> vào control
    // tương tác (checkbox/label) do React quản lý, dễ vỡ khi re-render.
    const startNode = range.startContainer;
    const startEl = startNode.nodeType === Node.ELEMENT_NODE
      ? (startNode as Element)
      : startNode.parentElement;
    if (!startEl?.closest("[data-highlightable]")) {
      return;
    }
    rangeRef.current = range.cloneRange();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  function closeMenu() {
    rangeRef.current = null;
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function applyHighlight() {
    const range = rangeRef.current;
    if (!range) {
      closeMenu();
      return;
    }
    try {
      const mark = document.createElement("mark");
      mark.style.background = "#fde68a";
      mark.style.color = "inherit";
      mark.style.cursor = "pointer";
      mark.title = "Bấm để xóa highlight này";
      range.surroundContents(mark);
    } catch {
      /* selection spans nhiều node — bỏ qua */
    }
    closeMenu();
  }

  function applyNote() {
    const range = rangeRef.current;
    if (!range) {
      closeMenu();
      return;
    }
    const text = range.toString().trim();
    const markId = `note-mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const mark = document.createElement("mark");
      mark.id = markId;
      mark.style.background = "var(--accent-soft)";
      mark.style.color = "inherit";
      mark.style.cursor = "pointer";
      mark.title = "Ghi chú — bấm để xóa";
      range.surroundContents(mark);
      if (text) onCaptureNote(text, markId);
    } catch {
      /* selection spans nhiều node — bỏ qua */
    }
    closeMenu();
  }

  return { menu, handleMouseUp, applyHighlight, applyNote, closeMenu };
}

function SelectionMenu({
  state, onHighlight, onNote, onClose,
}: {
  state: SelectionMenuState | null;
  onHighlight: () => void;
  onNote: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [state, onClose]);

  if (!state) return null;
  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: state.x, top: state.y, transform: "translate(-50%, -120%)" }}
      className="z-50 flex gap-1 rounded-lg border border-border bg-surface p-1 shadow-xl"
    >
      <button type="button" onClick={onHighlight}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft">
        <Highlighter className="h-3.5 w-3.5" /> Highlight
      </button>
      <button type="button" onClick={onNote}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft">
        <NotebookPen className="h-3.5 w-3.5" /> Ghi chú
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Reading split-pane với divider kéo được + highlight
// ------------------------------------------------------------------
function ReadingSplitPane({
  page, questions, order, answers, flagged, focusedId, onAnswer, onFlag, onCaptureNote,
}: {
  page: ExamPage;
  questions: PlayerQuestion[];
  order: Map<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<number, any>;
  flagged: Set<number>;
  focusedId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (q: PlayerQuestion, r: any) => void;
  onFlag: (id: number) => void;
  onCaptureNote: (text: string, markId: string, stepKey: string) => void;
}) {
  const [leftPct, setLeftPct] = useState(52);
  const containerRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const stepKey = `page-${page.id}`;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(70, Math.max(30, pct)));
    };
    const onUp = () => (draggingRef.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const passageSel = useSelectionCapture(passageRef, (text, markId) => onCaptureNote(text, markId, stepKey));
  const questionsSel = useSelectionCapture(questionsRef, (text, markId) => onCaptureNote(text, markId, stepKey));
  const passageContentRef = useImperativeHtml(page.passageContent ?? "");

  return (
    <div>
      <div className="border-b border-border px-6 py-2 text-sm font-medium"
        style={{ background: "#F1EADF", color: "#26211b" }}>
        {page.partLabel ?? `Part ${page.pageNumber}`}
      </div>
      <div ref={containerRef} className="flex" style={{ height: "calc(100vh - 108px)" }}>
        {/* Passage */}
        <div className="relative overflow-y-auto border-r border-border" style={{ width: `${leftPct}%` }}>
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-bg/90 px-6 py-2 backdrop-blur">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted">
              <BookOpen className="h-3.5 w-3.5" /> {page.passageTitle}
            </span>
            <span className="text-xs text-muted">Bôi đen văn bản để highlight hoặc ghi chú</span>
          </div>
          <div ref={passageRef} onMouseUp={passageSel.handleMouseUp} className="select-text px-6 py-4">
            <div ref={passageContentRef} data-highlightable="true"
              className="prose prose-sm dark:prose-invert max-w-none"
              style={{ fontFamily: "var(--font-serif)", fontSize: "15.5px", lineHeight: 1.85 }}
            />
          </div>
          <SelectionMenu state={passageSel.menu} onHighlight={passageSel.applyHighlight}
            onNote={passageSel.applyNote} onClose={passageSel.closeMenu} />
        </div>

        {/* Divider */}
        <div
          onMouseDown={() => (draggingRef.current = true)}
          className="w-2 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary"
          title="Kéo để chia cột"
        />

        {/* Questions */}
        <div ref={questionsRef} onMouseUp={questionsSel.handleMouseUp}
          className="relative flex-1 select-text overflow-y-auto px-6 py-4" style={{ width: `${100 - leftPct}%` }}>
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionCard key={q.quizQuestionId} index={cardLabel(q, order)}
                question={q} answer={answers[q.quizQuestionId]} flagged={flagged.has(q.quizQuestionId)}
                order={order}
                focused={isFocusedQuestion(focusedId, q.quizQuestionId)}
                onChange={(r) => onAnswer(q, r)} onFlag={() => onFlag(q.quizQuestionId)} />
            ))}
          </div>
          <SelectionMenu state={questionsSel.menu} onHighlight={questionsSel.applyHighlight}
            onNote={questionsSel.applyNote} onClose={questionsSel.closeMenu} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Listening: audio dùng chung toàn quiz (xem <audio> ở QuizPlayerPage) +
// waveform + note completion. Component này chỉ hiển thị trạng thái phát dùng
// chung, không tự quản lý audio riêng — mọi Part Listening đều phản ánh cùng
// một tiến trình phát, và một khi đã bấm phát thì không còn nút tạm dừng.
// ------------------------------------------------------------------
const TRANSFER_TIME_SECONDS = 600; // 10 phút theo chuẩn IELTS CDT

function seededBarHeights(count: number): number[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: count }, () => 0.3 + rand() * 0.7);
}
const WAVEFORM_HEIGHTS = seededBarHeights(40);

function ListeningPane({
  page, questions, order, answers, flagged, focusedId, onAnswer, onFlag,
  started, current, duration, ended, transferLeft, onStart,
}: {
  page: ExamPage;
  questions: PlayerQuestion[];
  order: Map<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<number, any>;
  flagged: Set<number>;
  focusedId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (q: PlayerQuestion, r: any) => void;
  onFlag: (id: number) => void;
  started: boolean;
  current: number;
  duration: number;
  ended: boolean;
  transferLeft: number | null;
  onStart: () => void;
}) {
  const progress = duration > 0 ? current / duration : 0;
  const playedBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  return (
    <div id={`q-page-${page.id}`}>
      <div className="border-b border-border px-6 py-2 text-sm font-medium"
        style={{ background: "#F1EADF", color: "#26211b" }}>
        {page.partLabel ?? `Part ${page.pageNumber}`} — Listening
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Audio bar — dùng chung, không có nút tạm dừng một khi đã bấm phát */}
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
          <button
            type="button"
            onClick={onStart}
            disabled={started}
            aria-label={started ? "Đang phát" : "Phát"}
            title={started ? "Audio đang phát, không thể tạm dừng" : "Bắt đầu phát audio"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green text-white disabled:opacity-70"
          >
            {started ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-sm"
                style={{
                  height: `${Math.round(h * 28)}px`,
                  background: i < playedBars ? "var(--green)" : "var(--border)",
                }}
              />
            ))}
          </div>

          <span
            className="shrink-0 font-mono text-sm text-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {fmt(Math.floor(current))} / {fmt(Math.floor(duration))}
          </span>
        </div>

        {!started && (
          <p className="mt-2 text-xs text-muted">
            Bấm phát để bắt đầu — audio sẽ chạy liên tục qua cả 3 phần, kể cả khi bạn chuyển trang, và không thể tạm dừng.
          </p>
        )}

        {/* Transfer time banner */}
        {ended && transferLeft !== null && transferLeft > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Đã hết giờ nghe. Bạn có <strong>{fmt(transferLeft)}</strong> để chuyển đáp
              án sang phiếu trả lời trước khi phần thi tiếp theo bắt đầu.
            </span>
          </div>
        )}

        {/* Note completion */}
        <div className="mt-5 space-y-4">
          {questions.map((q) => (
            <NoteCompletionCard
              key={q.quizQuestionId}
              index={order.get(`${q.quizQuestionId}`)!}
              question={q}
              answer={answers[q.quizQuestionId]}
              flagged={flagged.has(q.quizQuestionId)}
              focused={isFocusedQuestion(focusedId, q.quizQuestionId)}
              onChange={(r) => onAnswer(q, r)}
              onFlag={() => onFlag(q.quizQuestionId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteCompletionCard({
  index, question, answer, flagged, focused, onChange, onFlag,
}: {
  index: number;
  question: PlayerQuestion;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  flagged: boolean;
  focused?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (r: any) => void;
  onFlag: () => void;
}) {
  const text: string = answer?.text ?? "";
  const stem = question.stem ?? question.name;

  return (
    <div id={`q-${question.quizQuestionId}`}
      className={`flex items-start gap-3 rounded-card border bg-surface p-4 transition-colors ${
        focused ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
        {index}
      </span>
      <HtmlWithBlanks
        html={stem}
        markerPattern={/_{3,}/g}
        className="prose prose-sm dark:prose-invert max-w-none flex-1"
        renderBlank={() => (
          <input
            type="text"
            value={text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="mx-1 w-28 border-0 border-b-2 bg-transparent px-1 text-center outline-none"
            style={{ borderColor: text ? "var(--primary)" : "var(--border)" }}
          />
        )}
      />
      <button type="button" onClick={onFlag} title="Đánh dấu"
        className={flagged ? "text-accent" : "text-faint hover:text-accent"}>
        <Flag className="h-4 w-4" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Writing editor với đếm từ
// ------------------------------------------------------------------
function WritingEditor({
  index, question, value, onChange,
}: {
  index: number;
  question: PlayerQuestion;
  value: string;
  onChange: (text: string) => void;
}) {
  const target = 250;
  const wc = wordCount(value);
  return (
    <div id={`q-${question.quizQuestionId}`} className="border-t border-border">
      <div className="border-b border-border px-6 py-2 text-sm font-medium"
        style={{ background: "#F1EADF", color: "#26211b" }}>
        Writing Task — Câu {index}
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-6 md:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đề bài</p>
          <div
            className="prose prose-sm dark:prose-invert mt-2 max-w-none"
            style={{ fontFamily: "var(--font-serif)", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: question.stem ?? question.name }}
          />
        </div>
        <div className="flex flex-col rounded-card border border-border bg-surface">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Viết bài của bạn tại đây…"
            className="min-h-[280px] flex-1 resize-none rounded-t-card bg-transparent p-4 outline-none"
            style={{ fontFamily: "var(--font-serif)", fontSize: "15.5px", lineHeight: 1.9 }}
          />
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-sm">
            <span className={`font-mono font-semibold ${wc >= target ? "text-green" : "text-muted"}`}>
              {wc} từ
            </span>
            <span className="text-muted">Mục tiêu: {target} từ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Question card (MC / TFNG / Short answer) + flag
// ------------------------------------------------------------------
function QuestionCard({
  index, question, answer, flagged, focused, order, onChange, onFlag,
}: {
  index: number | string;
  question: PlayerQuestion;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer: any;
  flagged: boolean;
  focused?: boolean;
  order?: Map<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (r: any) => void;
  onFlag: () => void;
}) {
  const stemRef = useImperativeHtml(question.stem ?? question.name);
  return (
    <div id={`q-${question.quizQuestionId}`}
      className={`rounded-card border bg-surface p-4 transition-colors ${
        focused ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}>
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-7 shrink-0 place-items-center rounded-full bg-primary-soft px-2 text-sm font-semibold text-primary" style={{ minWidth: "1.75rem" }}>
          {index}
        </span>
        <div
          ref={stemRef}
          data-highlightable="true"
          className="prose prose-sm dark:prose-invert max-w-none flex-1 font-medium"
        />
        <button type="button" onClick={onFlag} title="Đánh dấu"
          className={flagged ? "text-accent" : "text-faint hover:text-accent"}>
          <Flag className="h-4 w-4" />
        </button>
      </div>

      <div className="pl-10">
        {question.audience === "KIDS" && question.type === "MATCHING" ? (
          <KidsMatchingGame
            pairs={question.matchingPairs}
            pool={question.matchingRightPool}
            answer={answer}
            onChange={onChange}
          />
        ) : question.audience === "KIDS" && question.type === "DRAG_DROP_TEXT" ? (
          <KidsDragDropSentence
            template={(question.settings as { template?: string } | null)?.template ?? ""}
            dragItems={question.dragItems}
            answer={answer}
            onChange={onChange}
          />
        ) : (
          <QuestionRenderer question={question} answer={answer} onChange={onChange} blankOrder={order} />
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  questions,
}: {
  result: AttemptResult;
  questions: PlayerQuestion[];
}) {
  const pct =
    result.maxScore && result.maxScore > 0
      ? Math.round(((result.rawScore ?? 0) / result.maxScore) * 100)
      : 0;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const kidsQuestionIds = useMemo(
    () =>
      new Set(
        questions.filter((q) => q.audience === "KIDS").map((q) => q.quizQuestionId),
      ),
    [questions],
  );

  // Phản hồi âm thanh ngay khi có kết quả chấm, chỉ áp dụng cho câu hỏi trẻ em.
  useEffect(() => {
    const kidsItems = result.breakdown.filter((b) => kidsQuestionIds.has(b.quizQuestionId));
    kidsItems.forEach((b, i) => {
      const play = b.correct ? playCorrectSound : playIncorrectSound;
      setTimeout(play, i * 250);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 py-10">
      <div className="w-full max-w-xl rounded-[18px] border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">Kết quả bài làm</p>
        <div className="mt-2 text-5xl font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>
          {result.rawScore ?? 0}
          <span className="text-2xl text-muted">/{result.maxScore ?? 0}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{pct}% đúng</p>
        {result.bandScore != null && (
          <div className="mt-4 inline-block rounded-full bg-accent-soft px-5 py-2 text-lg font-bold text-accent">
            Band {result.bandScore}
          </div>
        )}
        <div className="mt-6 space-y-2 text-left">
          {result.breakdown.map((b, i) => {
            const hasDetail = Boolean(b.explanation || b.answerParagraphHtml);
            const isOpen = expanded.has(b.quizQuestionId);
            const isKids = kidsQuestionIds.has(b.quizQuestionId);
            const kidsAnim = isKids ? (b.correct ? "animate-bubble-pop" : "animate-kids-shake") : "";
            return (
              <div
                key={b.quizQuestionId}
                className={`rounded-lg border border-border text-sm ${kidsAnim}`}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted">Câu {i + 1}</span>
                  <span className="flex-1 truncate px-2">{b.name}</span>
                  {b.correct === null ? <span className="text-muted">Chấm tay</span>
                    : b.correct ? (
                      <span className="flex items-center gap-1 font-semibold text-green">
                        <CheckCircle2 className="h-4 w-4" /> Đúng
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-red">
                        <XCircle className="h-4 w-4" /> Sai
                      </span>
                    )}
                  {hasDetail && (
                    <button
                      type="button"
                      onClick={() => toggle(b.quizQuestionId)}
                      className="ml-2 flex items-center gap-1 text-xs font-semibold text-accent"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {hasDetail && isOpen && (
                  <div className="border-t border-border bg-bg px-3 py-3 text-left">
                    {b.answerParagraphHtml && (
                      <div className="mb-2">
                        <p className="mb-1 text-xs font-semibold text-muted">
                          Đáp án nằm ở đoạn {b.answerParagraphIndex} trong passage:
                        </p>
                        <div
                          className="prose prose-sm dark:prose-invert rounded-lg bg-accent-soft p-3"
                          dangerouslySetInnerHTML={{ __html: b.answerParagraphHtml }}
                        />
                      </div>
                    )}
                    {b.explanation && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Giải thích:</p>
                        <div
                          className="prose prose-sm dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: b.explanation }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {result.violations > 0 && (
          <p className="mt-4 text-sm text-red">
            Ghi nhận {result.violations} lần vi phạm chống gian lận.
          </p>
        )}
        <Link href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white">
          Về bảng điều khiển
        </Link>
      </div>
    </div>
  );
}
