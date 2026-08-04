"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  Headphones,
  Highlighter,
  Hourglass,
  Lightbulb,
  Menu,
  NotebookPen,
  Play,
  Timer,
  Trash2,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HtmlWithBlanks } from "@/components/HtmlWithBlanks";
import { KidsMatchingGame } from "@/components/kids/KidsMatchingGame";
import { Logo } from "@/components/Logo";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { ApiError, quizApi } from "@/lib/api";
import { playCorrectSound, playIncorrectSound } from "@/lib/kidsFeedback";
import { isTfngOptionSet } from "@/lib/tfngOptionSet";
import { useToast } from "@/store/toast";
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
  // MCQ nhiều đáp án đúng (vd "chọn HAI chữ cái") chiếm nhiều số thứ tự IELTS
  // thật dù chỉ 1 bản ghi câu hỏi — không có subIndex thật như Cloze (chỉ 1
  // selectedOptionIds chung), nên các slot này để subIndex trống, tự rơi về
  // nhánh "answer != null" chung của isSlotAnswered (chia sẻ đúng 1 trạng
  // thái trả lời/cờ đánh dấu cho toàn bộ N slot của câu này).
  if (q.type === "MULTIPLE_CHOICE" && (q.correctAnswerCount ?? 1) > 1) {
    return Array.from({ length: q.correctAnswerCount ?? 1 }, (_, i) => ({
      key: `${q.quizQuestionId}:mc${i}`,
      quizQuestionId: q.quizQuestionId,
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

/** Nhãn số hiển thị trên thẻ câu hỏi: 1 số bình thường, hoặc dải số "4-6" cho
 * CLOZE nhiều chỗ trống / MCQ nhiều đáp án đúng — dùng chung đúng cách chia
 * slot của expandSlots() để không lệch với số hiện ở thanh điều hướng. */
function cardLabel(q: PlayerQuestion, order: Map<string, number>): string {
  const nums = expandSlots(q)
    .map((s) => order.get(s.key))
    .filter((n): n is number => n != null);
  if (nums.length === 0) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${min}` : `${min}-${max}`;
}

/** 1 câu MULTIPLE_CHOICE độc lập, hoặc 1 nhóm câu cùng dùng chung 1 bộ đáp án
 * (vd Yes/No/Not Given lặp lại cho nhiều câu) — nhóm để hiện thành 1 bảng
 * lưới, mỗi câu vẫn là 1 quizQuestion/điểm/chấm riêng hệt như trước (thuần
 * gộp hiển thị, KHÔNG đổi dữ liệu/logic chấm điểm). */
type QuestionOrGroup = PlayerQuestion | { kind: "mc-grid"; key: string; columns: string[]; rows: PlayerQuestion[] };

function optionSignature(q: PlayerQuestion): string | null {
  if (q.type !== "MULTIPLE_CHOICE" || q.options.length < 2) return null;
  // MCQ nhiều đáp án đúng không khớp mô hình "1 radio mỗi hàng" của bảng
  // lưới — giữ nguyên hiện dạng checkbox riêng lẻ. Yes/No/Not-Given (hay
  // True/False/Not-Given) luôn phải hiện riêng từng câu, xếp dọc, không bao
  // giờ gộp thành lưới dù trùng đáp án với câu khác (khác bản chất với cụm
  // Matching Features thật — xem isTfngOptionSet).
  if ((q.correctAnswerCount ?? 1) > 1) return null;
  const contents = q.options.map((o) => o.content);
  if (isTfngOptionSet(contents)) return null;
  return contents.map((c) => c.trim().toUpperCase()).join("|");
}

/** Nội dung câu hỏi di chuyển từ Moodle hay lặp lại y hệt 1 bộ đáp án nhỏ cho
 * nhiều câu liền nhau (vd Yes/No/Not Given cho từng câu nhận định) — thay vì
 * hiện N thẻ MC riêng lẻ (mỗi thẻ lặp lại cùng 3 đáp án), gộp hiển thị thành
 * 1 bảng lưới giống format thi IELTS CD thật. Nhóm theo cùng chữ ký đáp án
 * trên cùng 1 trang, không cần liền kề theo sortOrder (dữ liệu di chuyển đôi
 * khi xen lẫn thứ tự) — sắp lại theo `order` (số thứ tự thật) khi gộp.
 */
function groupMcGrids(questions: PlayerQuestion[], order: Map<string, number>): QuestionOrGroup[] {
  const bySignature = new Map<string, PlayerQuestion[]>();
  questions.forEach((q) => {
    const sig = optionSignature(q);
    if (sig == null) return;
    const list = bySignature.get(sig) ?? [];
    list.push(q);
    bySignature.set(sig, list);
  });

  const grouped = new Set<number>();
  const groupByFirstMember = new Map<number, QuestionOrGroup>();
  bySignature.forEach((members, sig) => {
    if (members.length < 2) return;
    const sorted = [...members].sort(
      (a, b) => (order.get(`${a.quizQuestionId}`) ?? 0) - (order.get(`${b.quizQuestionId}`) ?? 0),
    );
    const columns = sorted[0].options.map((o) => o.content);
    sorted.forEach((m) => grouped.add(m.quizQuestionId));
    groupByFirstMember.set(sorted[0].quizQuestionId, {
      kind: "mc-grid",
      key: `grid-${sig}`,
      columns,
      rows: sorted,
    });
  });

  const result: QuestionOrGroup[] = [];
  questions.forEach((q) => {
    if (groupByFirstMember.has(q.quizQuestionId)) {
      result.push(groupByFirstMember.get(q.quizQuestionId)!);
    } else if (!grouped.has(q.quizQuestionId)) {
      result.push(q);
    }
  });
  return result;
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
  /** Đoạn văn bản gốc đã bôi đen (nếu ghi chú được tạo từ selection), để hiển thị làm ngữ cảnh. */
  quote?: string;
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
  return (
    <Suspense
      fallback={<div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>}
    >
      <QuizPlayerPageInner />
    </Suspense>
  );
}

function QuizPlayerPageInner() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);
  const router = useRouter();
  const returnTo = useSearchParams().get("returnTo");
  const { accessToken, hydrated } = useAuthStore();

  const [attempt, setAttempt] = useState<AttemptPlayer | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [resultQuestions, setResultQuestions] = useState<PlayerQuestion[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  function addNote(text: string, markId?: string, stepKey?: string, quote?: string) {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: `${Date.now()}-${Math.random()}`, text: text.trim(), createdAt: Date.now(), markId, stepKey, quote },
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
      toast.success("Đã nộp bài");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nộp bài thất bại, vui lòng thử lại");
      submittingRef.current = false;
    }
  }, [attemptId, token, attempt, toast]);

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
        toast.error(`⚠ Cảnh báo chuyển tab (${res.violations}/${attempt.maxViolations})`);
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
  }, [attempt, attemptId, token, doSubmit, toast]);

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
  // Sắp theo pageNumber xuyên suốt reading+listening (không nhóm theo kind trước) để
  // Part 1 luôn hiện trước Part 2/3 dù 2 loại trang bị trộn lẫn trong cùng 1 quiz.
  const steps: Step[] = useMemo(() => {
    if (!attempt) return [];
    const passagePages = attempt.pages
      .filter((p) => p.passageKind === "READING" || p.passageKind === "LISTENING")
      .sort((a, b) => a.pageNumber - b.pageNumber);
    const passagePageIds = new Set(passagePages.map((p) => p.id));
    const questionsForPage = (pageId: number) =>
      attempt.questions.filter((q) => q.pageId === pageId && q.type !== "ESSAY");
    const essayQuestions = attempt.questions.filter((q) => q.type === "ESSAY");
    const standalone = attempt.questions.filter(
      (q) => q.type !== "ESSAY" && !(q.pageId != null && passagePageIds.has(q.pageId)),
    );

    const list: Step[] = [];
    passagePages.forEach((page) =>
      list.push({
        kind: page.passageKind === "LISTENING" ? "listening" : "reading",
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
  if (result) return <ResultView result={result} questions={resultQuestions} returnTo={returnTo} />;
  if (!attempt) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        Không tải được bài làm.{" "}
        <Link href="/dashboard" className="text-accent">Về bảng điều khiển</Link>
      </div>
    );
  }

  const answeredCount = orderedSlots.filter((s) => isSlotAnswered(s, answers)).length;
  // Giao diện thi trắng-đen chuẩn phòng thi thật chỉ áp dụng cho Academic/IELTS
  // (có Part đọc/nghe/viết) — khóa Trẻ em chỉ có step "standalone" nên không đổi màu.
  const isExamMode = steps.some((s) => s.kind === "reading" || s.kind === "listening" || s.kind === "essay");

  return (
    <div
      className={`flex min-h-screen flex-col bg-bg pb-16 ${isExamMode ? "exam-mode" : ""}`}
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
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            if (t > maxAudioReachedRef.current + 1.5) {
              e.currentTarget.currentTime = maxAudioReachedRef.current;
              return;
            }
            maxAudioReachedRef.current = Math.max(maxAudioReachedRef.current, t);
          }}
          onEnded={() => setAudioEnded(true)}
        />
      )}

      {/*
        Header phòng thi — luôn giữ thanh "chrome" tối màu cố định, khớp bố
        cục giao diện phòng thi CD thật (logo trái, icon trạng thái phải),
        không đổi theo isExamMode — chỉ phần nội dung bên dưới đổi trắng-đen.
      */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
        style={{ background: "#262019", color: "#ECE4D8" }}>
        <Logo className="[&_span]:text-white" />
        <div className="flex items-center gap-4">
          <Wifi className="h-4 w-4 opacity-60" aria-hidden />
          <span className="relative flex items-center">
            <Bell className="h-4 w-4 opacity-60" aria-hidden />
            {attempt.antiCheatEnabled && violations > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-red text-[9px] font-bold text-white">
                {violations}
              </span>
            )}
          </span>
          {remaining !== null && (
            <span className={`flex items-center gap-1 font-mono text-lg ${remaining < 60 ? "text-red" : ""}`}
              style={{ fontFamily: "var(--font-mono)" }}>
              <Timer className="h-4 w-4" /> {fmt(remaining)}
            </span>
          )}
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded hover:bg-white/10"
              title="Menu" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-surface text-text shadow-lg">
                <button type="button"
                  onClick={() => { setNotesOpen(true); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-soft">
                  <NotebookPen className="h-4 w-4" /> Ghi chú{notes.length > 0 ? ` (${notes.length})` : ""}
                </button>
                </div>
              </>
            )}
          </div>
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

      {/*
        Bottom navigator: hàng tab theo Part ở trên, chỉ sổ ra số câu của
        Part đang chọn ở dưới — bấm tab khác nhảy stepIndex + đổi số hiện.
      */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-4 py-2.5">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-xs text-muted">
              {answeredCount}/{orderedSlots.length} câu
            </span>
            {steps.map((step, idx) => (
              <button
                key={step.key}
                type="button"
                onClick={() => {
                  const slots = stepSlots(step);
                  if (slots.length > 0) goToQuestion(slots[0].key);
                  else setStepIndex(idx);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  idx === stepIndex ? "bg-primary text-white" : "bg-soft text-muted hover:text-text"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {stepSlots(steps[stepIndex]).map((slot) => {
              const answered = isSlotAnswered(slot, answers);
              const isFlagged = flagged.has(slot.quizQuestionId);
              const isCurrent = focusId === slot.key;
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => goToQuestion(slot.key)}
                  title={`Câu ${order.get(slot.key)} — ${steps[stepIndex].label}`}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-transform ${
                    isCurrent ? "ring-2 ring-primary ring-offset-1 ring-offset-surface" : ""
                  } ${
                    // border-dashed cho cờ đánh dấu (không chỉ dựa vào màu) —
                    // ở chế độ thi trắng-đen, accent/green trùng màu nhau nên
                    // phải phân biệt được bằng hình dạng viền, không riêng màu.
                    isFlagged ? "border-dashed border-accent bg-accent-soft text-accent"
                      : answered ? "border-green bg-green-soft text-green"
                      : "border-border text-muted"}`}>
                  {order.get(slot.key)}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/*
        Ghi chú (mở từ menu header) + điều hướng câu trước/sau, góc dưới
        bên phải — khớp bố cục tham khảo (chỉ còn 2 mũi tên ở góc này).
      */}
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={doSubmit}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 font-semibold text-white shadow-md hover:opacity-90">
            <CheckCircle2 className="h-4 w-4" /> Nộp bài
          </button>
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
              <span className="flex-1 whitespace-pre-wrap break-words">
                {n.quote && (
                  <span className="mb-0.5 block truncate text-xs italic text-muted">“{n.quote}”</span>
                )}
                {n.text}
              </span>
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

// Highlight màu vàng thuần (chức năng "Highlight") so với cam-đậm cho "Ghi chú"
// — trước đây ghi chú dùng var(--accent-soft), vốn là màu nền pill rất nhạt
// (gần trắng ở light mode, gần đen ở dark mode), không phải màu để bôi đen
// văn bản nên gần như không thấy được. Dùng 2 màu cố định, đủ đậm ở cả 2 theme,
// khác tông để phân biệt 2 loại đánh dấu.
const HIGHLIGHT_COLOR = "#fde68a";
const NOTE_MARK_COLOR = "#f7bd7a";

type SelectionStage =
  | { kind: "closed" }
  | { kind: "choice"; x: number; y: number }
  | { kind: "compose"; x: number; y: number; sessionKey: number };

function useSelectionCapture(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onCaptureNote: (text: string, quote: string, markId: string) => void,
) {
  const [stage, setStage] = useState<SelectionStage>({ kind: "closed" });
  const rangeRef = useRef<Range | null>(null);

  function handleMouseUp(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const existingMark = target.closest("mark");
    if (existingMark && containerRef.current?.contains(existingMark)) {
      unwrapMark(existingMark);
      setStage({ kind: "closed" });
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
    setStage({ kind: "choice", x: e.clientX, y: e.clientY });
  }

  function closeMenu() {
    rangeRef.current = null;
    setStage({ kind: "closed" });
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
      mark.style.background = HIGHLIGHT_COLOR;
      mark.style.color = "inherit";
      mark.style.cursor = "pointer";
      mark.title = "Bấm để xóa highlight này";
      range.surroundContents(mark);
    } catch {
      /* selection spans nhiều node — bỏ qua */
    }
    closeMenu();
  }

  // Chọn "Ghi chú" chỉ MỞ Ô NHẬP TEXT tại đúng vị trí đã bôi đen — không tạo
  // mark/ghi chú ngay lập tức (trước đây làm vậy, khiến người dùng không có
  // cơ hội gõ nội dung ghi chú của riêng mình, chỉ lưu lại đúng đoạn đã bôi đen).
  function openNoteCompose() {
    if (!rangeRef.current) {
      closeMenu();
      return;
    }
    setStage((s) =>
      s.kind === "choice" ? { kind: "compose", x: s.x, y: s.y, sessionKey: Date.now() } : s,
    );
  }

  function submitNote(text: string) {
    const range = rangeRef.current;
    const trimmed = text.trim();
    if (!range || !trimmed) {
      closeMenu();
      return;
    }
    const quote = range.toString().trim();
    const markId = `note-mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const mark = document.createElement("mark");
      mark.id = markId;
      mark.style.background = NOTE_MARK_COLOR;
      mark.style.color = "inherit";
      mark.style.cursor = "pointer";
      mark.title = "Ghi chú — bấm để xóa";
      range.surroundContents(mark);
      onCaptureNote(trimmed, quote, markId);
    } catch {
      /* selection spans nhiều node — bỏ qua */
    }
    closeMenu();
  }

  return { stage, handleMouseUp, applyHighlight, openNoteCompose, submitNote, closeMenu };
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

// Ô nhỏ để gõ nội dung ghi chú, hiện ngay tại vị trí đã bôi đen sau khi bấm
// "Ghi chú" — mark/ghi chú chỉ thực sự được tạo khi bấm Lưu (hoặc Enter).
function NoteComposer({
  state, onSubmit, onCancel,
}: {
  state: SelectionMenuState | null;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!state) return;
    textareaRef.current?.focus();
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;
  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: state.x, top: state.y, transform: "translate(-50%, -120%)" }}
      className="z-50 w-64 rounded-lg border border-border bg-surface p-2 shadow-xl"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit(text);
          }
        }}
        placeholder="Nhập nội dung ghi chú…"
        rows={3}
        className="input w-full resize-none text-sm"
      />
      <div className="mt-1.5 flex justify-end gap-1.5">
        <button type="button" onClick={onCancel}
          className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-soft">
          Hủy
        </button>
        <button type="button" onClick={() => onSubmit(text)}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
          Lưu
        </button>
      </div>
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
  onCaptureNote: (text: string, markId: string, stepKey: string, quote: string) => void;
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

  const passageSel = useSelectionCapture(passageRef, (text, quote, markId) => onCaptureNote(text, markId, stepKey, quote));
  const questionsSel = useSelectionCapture(questionsRef, (text, quote, markId) => onCaptureNote(text, markId, stepKey, quote));
  const passageContentRef = useImperativeHtml(page.passageContent ?? "");

  const passageChoice = passageSel.stage.kind === "choice" ? passageSel.stage : null;
  const passageCompose = passageSel.stage.kind === "compose" ? passageSel.stage : null;
  const questionsChoice = questionsSel.stage.kind === "choice" ? questionsSel.stage : null;
  const questionsCompose = questionsSel.stage.kind === "compose" ? questionsSel.stage : null;

  // Matching Heading: 1 câu DRAG_DROP_TEXT có passageId trùng đoạn văn đang
  // hiện -> marker [[n]] nằm ngay trong passageContent. Mỗi marker hiện 1
  // dropdown chọn tiêu đề (không kéo-thả) — giữ nguyên shape `placements`
  // cũ (itemId -> targetLabel) nên chấm điểm (gradeDragDropText) không đổi.
  // passageId trùng KHÔNG đủ để coi là "nhúng" — dữ liệu di chuyển từ Moodle
  // thường gắn passageId cho MỌI câu hỏi trên trang (kể cả câu sentence-
  // completion độc lập, template/marker nằm ở settings riêng chứ không phải
  // trong đoạn văn) — chỉ nhúng khi marker [[n]] thật sự có trong passageContent.
  const embeddedQuestion = useMemo(
    () =>
      questions.find(
        (q) =>
          q.type === "DRAG_DROP_TEXT" &&
          page.passageId != null &&
          q.passageId === page.passageId &&
          /\[\[\d+\]\]/.test(page.passageContent ?? ""),
      ) ?? null,
    [questions, page.passageId, page.passageContent],
  );
  const embeddedPlacements: Record<string, string> = embeddedQuestion
    ? (answers[embeddedQuestion.quizQuestionId]?.placements ?? {})
    : {};

  function handleSelectHeading(targetLabel: string, itemId: string) {
    if (!embeddedQuestion) return;
    const next = { ...embeddedPlacements };
    Object.keys(next).forEach((id) => {
      // Giải phóng target này (nếu đang có tiêu đề khác) và giải phóng chính
      // itemId mới chọn khỏi bất kỳ target nào khác nó từng được gán (mỗi
      // tiêu đề chỉ dùng được 1 lần, giống hệt quy tắc kéo-thả cũ).
      if (next[id] === targetLabel || id === itemId) delete next[id];
    });
    if (itemId) next[itemId] = targetLabel;
    onAnswer(embeddedQuestion, { placements: next });
  }

  return (
    <div>
      <div className="border-b border-border px-6 py-2 text-sm font-medium"
        style={{ background: "#f0f0f0", color: "#000000" }}>
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
          <div ref={passageRef} onMouseUp={passageSel.handleMouseUp} className="select-text px-6 py-4"
            style={{ fontFamily: "var(--font-serif)", fontSize: "15.5px", lineHeight: 1.85 }}>
            {embeddedQuestion ? (
              <HtmlWithBlanks
                html={page.passageContent ?? ""}
                markerPattern={/\[\[(\d+)\]\]/g}
                className="prose prose-sm dark:prose-invert max-w-none"
                renderBlank={(targetLabel) => {
                  const selectedItemId = Object.keys(embeddedPlacements).find(
                    (id) => embeddedPlacements[id] === targetLabel,
                  ) ?? "";
                  return (
                    <select
                      value={selectedItemId}
                      onChange={(e) => handleSelectHeading(targetLabel, e.target.value)}
                      className="input mx-1 inline-block w-auto align-middle text-sm"
                    >
                      <option value="">— Chọn tiêu đề —</option>
                      {embeddedQuestion.dragItems.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.content}
                        </option>
                      ))}
                    </select>
                  );
                }}
              />
            ) : (
              <div ref={passageContentRef} data-highlightable="true"
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            )}
          </div>
          <SelectionMenu state={passageChoice} onHighlight={passageSel.applyHighlight}
            onNote={passageSel.openNoteCompose} onClose={passageSel.closeMenu} />
          <NoteComposer key={passageCompose?.sessionKey ?? "closed"} state={passageCompose}
            onSubmit={passageSel.submitNote} onCancel={passageSel.closeMenu} />
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
            {embeddedQuestion && (
              <EmbeddedMatchingInfoCard index={cardLabel(embeddedQuestion, order)}
                question={embeddedQuestion}
                flagged={flagged.has(embeddedQuestion.quizQuestionId)}
                focused={isFocusedQuestion(focusedId, embeddedQuestion.quizQuestionId)}
                onFlag={() => onFlag(embeddedQuestion.quizQuestionId)} />
            )}
            {groupMcGrids(questions.filter((q) => q !== embeddedQuestion), order).map((item) =>
              "kind" in item ? (
                <McGridCard key={item.key} columns={item.columns} rows={item.rows} order={order}
                  answers={answers} flagged={flagged} focusedId={focusedId}
                  onAnswer={onAnswer} onFlag={onFlag} />
              ) : (
                <QuestionCard key={item.quizQuestionId} index={cardLabel(item, order)}
                  question={item} answer={answers[item.quizQuestionId]} flagged={flagged.has(item.quizQuestionId)}
                  order={order}
                  focused={isFocusedQuestion(focusedId, item.quizQuestionId)}
                  onChange={(r) => onAnswer(item, r)} onFlag={() => onFlag(item.quizQuestionId)} />
              ),
            )}
          </div>
          <SelectionMenu state={questionsChoice} onHighlight={questionsSel.applyHighlight}
            onNote={questionsSel.openNoteCompose} onClose={questionsSel.closeMenu} />
          <NoteComposer key={questionsCompose?.sessionKey ?? "closed"} state={questionsCompose}
            onSubmit={questionsSel.submitNote} onCancel={questionsSel.closeMenu} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Listening: audio dùng chung toàn quiz (xem <audio> ở QuizPlayerPage) +
// note completion. Component này chỉ hiển thị trạng thái phát dùng chung,
// không tự quản lý audio riêng — mọi Part Listening đều phản ánh cùng một
// tiến trình phát, và một khi đã bấm phát thì không còn cách tạm dừng/tua.
// ------------------------------------------------------------------
const TRANSFER_TIME_SECONDS = 600; // 10 phút theo chuẩn IELTS CDT

function ListeningPane({
  page, questions, order, answers, flagged, focusedId, onAnswer, onFlag,
  started, ended, transferLeft, onStart,
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
  ended: boolean;
  transferLeft: number | null;
  onStart: () => void;
}) {
  return (
    <div id={`q-page-${page.id}`} className="relative">
      <div className="border-b border-border px-6 py-2 text-sm font-medium"
        style={{ background: "#f0f0f0", color: "#000000" }}>
        {page.partLabel ?? `Part ${page.pageNumber}`} — Listening
      </div>

      {/*
        Cổng chặn trước khi nghe — học sinh không thao tác được câu hỏi cho
        tới khi bấm Play (thỏa chính sách autoplay-cần-cử-chỉ-người-dùng của
        trình duyệt). Sau khi bấm, audio tự chạy liên tục — không còn thanh
        waveform/thời gian/nút tạm dừng nào nữa (đúng chuẩn phòng thi thật).
      */}
      {!started && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-bg/95 px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-soft">
            <Headphones className="h-8 w-8 text-muted" />
          </div>
          <p className="max-w-sm text-sm text-muted">
            Bạn sẽ nghe 1 đoạn audio trong bài thi này. Bạn sẽ không được phép tạm dừng hoặc tua lại audio trong lúc trả lời câu hỏi.
          </p>
          <p className="text-sm text-muted">Để tiếp tục, bấm Phát.</p>
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2 rounded-lg bg-text px-5 py-2.5 text-sm font-semibold text-bg"
          >
            <Play className="h-4 w-4" /> Phát
          </button>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-6">
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

        {/* Câu hỏi — dùng chung QuestionCard/QuestionRenderer với Reading để mọi
            dạng câu hỏi (MC, Cloze, Drag-drop...) chấm/hiển thị đúng theo type,
            thay vì coi mọi câu trong Listening đều là note-completion 1 ô trống. */}
        <div className="mt-5 space-y-4">
          {groupMcGrids(questions, order).map((item) =>
            "kind" in item ? (
              <McGridCard key={item.key} columns={item.columns} rows={item.rows} order={order}
                answers={answers} flagged={flagged} focusedId={focusedId}
                onAnswer={onAnswer} onFlag={onFlag} />
            ) : (
              <QuestionCard
                key={item.quizQuestionId}
                index={cardLabel(item, order)}
                question={item}
                answer={answers[item.quizQuestionId]}
                flagged={flagged.has(item.quizQuestionId)}
                order={order}
                focused={isFocusedQuestion(focusedId, item.quizQuestionId)}
                onChange={(r) => onAnswer(item, r)}
                onFlag={() => onFlag(item.quizQuestionId)}
              />
            ),
          )}
        </div>
      </div>
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
        style={{ background: "#f0f0f0", color: "#000000" }}>
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
  // CLOZE's stem IS the full fill-in-the-blank passage (with {n} markers) —
  // QuestionRenderer already renders it complete with working inputs below,
  // so showing it again here would just duplicate it as unprocessed raw text.
  const showStemHeader = question.type !== "CLOZE";
  const stemRef = useImperativeHtml(showStemHeader ? (question.stem ?? question.name) : "");
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
          <Flag className="h-4 w-4" fill={flagged ? "currentColor" : "none"} />
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
        ) : (
          <QuestionRenderer question={question} answer={answer} onChange={onChange} blankOrder={order} />
        )}
      </div>
    </div>
  );
}

/** Bảng lưới gộp hiển thị cho N câu MULTIPLE_CHOICE dùng chung 1 bộ đáp án
 * (vd Yes/No/Not Given) — thuần hiển thị, mỗi hàng vẫn là 1 quizQuestion độc
 * lập với điểm/chấm/cờ đánh dấu riêng hệt như khi hiện thành thẻ rời (xem
 * groupMcGrids). Style mirror GRID_MATCHING thật (Lát 36). */
function McGridCard({
  columns, rows, order, answers, flagged, focusedId, onAnswer, onFlag,
}: {
  columns: string[];
  rows: PlayerQuestion[];
  order: Map<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answers: Record<number, any>;
  flagged: Set<number>;
  focusedId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnswer: (q: PlayerQuestion, r: any) => void;
  onFlag: (id: number) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-soft">
              <th className="border-b border-border p-3 text-left font-semibold text-text" />
              {columns.map((c) => (
                <th key={c} className="min-w-14 border-b border-l border-border p-3 text-center font-semibold text-text">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((q, idx) => {
              const selected: number[] = answers[q.quizQuestionId]?.selectedOptionIds ?? [];
              const isFlagged = flagged.has(q.quizQuestionId);
              return (
                <tr key={q.quizQuestionId}
                  className={`${idx % 2 === 1 ? "bg-soft/40" : ""} ${
                    isFocusedQuestion(focusedId, q.quizQuestionId) ? "ring-2 ring-inset ring-primary" : ""
                  }`}>
                  <td id={`q-${q.quizQuestionId}`} className="border-b border-border p-3">
                    <div className="flex items-start gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {order.get(`${q.quizQuestionId}`) ?? ""}
                      </span>
                      <span className="flex-1 font-medium">{q.stem ?? q.name}</span>
                      <button type="button" onClick={() => onFlag(q.quizQuestionId)} title="Đánh dấu"
                        className={isFlagged ? "text-accent" : "text-faint hover:text-accent"}>
                        <Flag className="h-4 w-4" fill={isFlagged ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </td>
                  {q.options.map((opt) => {
                    const checked = selected.includes(opt.id);
                    return (
                      <td key={opt.id} className="border-b border-l border-border p-0 text-center">
                        <label className="flex h-full w-full cursor-pointer items-center justify-center p-3 hover:bg-primary-soft">
                          <input
                            type="radio"
                            className="h-4 w-4 accent-current"
                            name={`mcgrid-${q.quizQuestionId}`}
                            checked={checked}
                            onChange={() => onAnswer(q, { selectedOptionIds: [opt.id] })}
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Pool các mục kéo-thả cho câu DRAG_DROP_TEXT nhúng vào đoạn văn (Lát 17) — ô
 * trống thật sự nằm bên đoạn văn cột trái, thẻ này chỉ hiện các mục chưa dùng. */
function EmbeddedMatchingInfoCard({
  index, question, flagged, focused, onFlag,
}: {
  index: number | string;
  question: PlayerQuestion;
  flagged: boolean;
  focused?: boolean;
  onFlag: () => void;
}) {
  return (
    <div id={`q-${question.quizQuestionId}`}
      className={`rounded-card border bg-surface p-4 transition-colors ${
        focused ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}>
      <div className="flex items-start gap-3">
        <span className="grid h-7 shrink-0 place-items-center rounded-full bg-primary-soft px-2 text-sm font-semibold text-primary" style={{ minWidth: "1.75rem" }}>
          {index}
        </span>
        <p className="flex-1 text-sm text-muted">
          Chọn tiêu đề phù hợp cho mỗi đoạn văn bằng ô chọn ngay trong đoạn văn bên trái.
        </p>
        <button type="button" onClick={onFlag} title="Đánh dấu"
          className={flagged ? "text-accent" : "text-faint hover:text-accent"}>
          <Flag className="h-4 w-4" fill={flagged ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

function ResultView({
  result,
  questions,
  returnTo,
}: {
  result: AttemptResult;
  questions: PlayerQuestion[];
  returnTo: string | null;
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
                    ) : b.awardedMark != null && b.awardedMark > 0 ? (
                      // Cloze/MCQ nhiều đáp án chấm từng phần — không hẳn
                      // "Sai" tuyệt đối, hiện đúng tỉ lệ điểm nhận được.
                      <span className="font-semibold text-accent">
                        Đúng {b.awardedMark}/{b.mark}
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
        <Link href={returnTo || "/dashboard"}
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white">
          {returnTo ? "Về khóa học" : "Về bảng điều khiển"}
        </Link>
      </div>
    </div>
  );
}
