/**
 * Âm thanh phản hồi đúng/sai cho giao diện luyện tập trẻ em — tổng hợp bằng
 * Web Audio API (OscillatorNode), không cần file âm thanh/thư viện ngoài.
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTones(
  tones: { freq: number; duration: number; delay: number }[],
  type: OscillatorType,
) {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const { freq, duration, delay } of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.05);
  }
}

/** "Ding-ding" đi lên vui tai — dùng khi đáp án đúng. */
export function playCorrectSound() {
  playTones(
    [
      { freq: 880, duration: 0.12, delay: 0 },
      { freq: 1175, duration: 0.18, delay: 0.1 },
    ],
    "sine",
  );
}

/** Tiếng rè nhẹ đi xuống — dùng khi đáp án sai, không quá chói tai với trẻ nhỏ. */
export function playIncorrectSound() {
  playTones([{ freq: 220, duration: 0.25, delay: 0 }], "sawtooth");
}
