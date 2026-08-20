"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechCheckStatus =
  | "idle"
  | "listening"
  | "correct"
  | "wrong"
  | "no-speech"
  | "denied"
  | "unsupported"
  | "error";

// Web Speech API không có type chuẩn trong lib.dom.d.ts — khai tối thiểu đủ
// dùng thay vì kéo cả gói @types/dom-speech-recognition vào.
interface MinimalSpeechRecognitionResult {
  0: { transcript: string };
  length: number;
  [index: number]: { transcript: string };
}
interface MinimalSpeechRecognitionEvent extends Event {
  results: { [index: number]: MinimalSpeechRecognitionResult; length: number };
}
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Chuẩn hoá giống hệt cách bản H5P gốc so khớp (bỏ dấu chấm, trim, chữ
// thường) — xem academic course/h5p-raw-backup, H5P.SpeakTheWords isCorrectAnswer().
function normalize(s: string): string {
  return s.replace(/\./g, "").trim().toLowerCase();
}

/** "Kiểm tra nhanh" bằng nhận diện giọng nói của trình duyệt (Web Speech
 * API) — CHỈ để học sinh tự luyện, cho phản hồi tức thì, KHÔNG thay thế điểm
 * chấm sao chính thức của giáo viên (xem V40__vocab_practice.sql — nhận diện
 * giọng nói không đáng tin cậy với giọng người Việt nên không dùng để chấm
 * điểm thật). Không hỗ trợ ở trình duyệt nào thì tự ẩn nút, không báo lỗi. */
export function useSpeechCheck() {
  const [status, setStatus] = useState<SpeechCheckStatus>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const isSupported = getSpeechRecognitionCtor() != null;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const check = useCallback((acceptedAnswer: string | null) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    if (!acceptedAnswer) {
      setStatus("error");
      return;
    }
    recognitionRef.current?.abort();
    setTranscript(null);
    setStatus("listening");

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    const target = normalize(acceptedAnswer);

    recognition.onresult = (e) => {
      const result = e.results[0];
      const alternatives: string[] = [];
      for (let i = 0; i < result.length; i++) alternatives.push(result[i].transcript);
      setTranscript(alternatives[0] ?? null);
      const matched = alternatives.some((alt) => normalize(alt) === target);
      setStatus(matched ? "correct" : "wrong");
    };
    recognition.onerror = (e) => {
      setStatus(e.error === "no-speech" ? "no-speech" : e.error === "not-allowed" ? "denied" : "error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setStatus("idle");
    setTranscript(null);
  }, []);

  return { status, transcript, isSupported, check, reset };
}
