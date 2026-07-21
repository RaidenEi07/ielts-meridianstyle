"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "denied" | "error";

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Bọc MediaRecorder/getUserMedia cho ghi âm luyện nói (Phase 15). */
export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setErrorMessage(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Trình duyệt này không hỗ trợ ghi âm.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setStatus("error");
        setErrorMessage("Ghi âm bị gián đoạn. Vui lòng thử lại.");
      };
      // Mic bị thu hồi quyền hoặc thiết bị bị ngắt giữa chừng: track kết thúc
      // nhưng MediaRecorder không phải lúc nào cũng bắn "error" — bắt riêng để
      // không bị kẹt mãi ở trạng thái "recording" không phản hồi.
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (recorderRef.current !== recorder) return;
          recorderRef.current = null;
          setStatus("error");
          setErrorMessage("Mất quyền truy cập micro giữa chừng. Vui lòng cấp lại quyền và thử lại.");
        };
      });
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setStatus("denied");
        setErrorMessage("Bạn chưa cho phép sử dụng micro. Hãy bật quyền micro trong cài đặt trình duyệt.");
      } else {
        setStatus("error");
        setErrorMessage("Không thể bắt đầu ghi âm.");
      }
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setStatus("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { status, errorMessage, start, stop };
}
