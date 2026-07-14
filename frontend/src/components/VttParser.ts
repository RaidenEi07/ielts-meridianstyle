export interface VttCue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(parts[0]) || 0;
}

const CUE_TIMING_PATTERN = /-->/;

/** Parser WebVTT tối giản: chỉ lấy mốc thời gian + text từng cue, bỏ qua cue settings. */
export function parseVtt(source: string): VttCue[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const cues: VttCue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CUE_TIMING_PATTERN.test(line)) continue;

    const [startRaw, endRaw] = line.split("-->");
    if (!startRaw || !endRaw) continue;
    const start = parseTimestamp(startRaw.trim());
    const end = parseTimestamp(endRaw.trim().split(" ")[0]);

    const textLines: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== "") {
      textLines.push(lines[j]);
      j++;
    }
    i = j;

    const text = textLines.join(" ").trim();
    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}
