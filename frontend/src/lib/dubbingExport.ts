import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { DubbingCharacter, DubbingRecording } from "@/lib/types";

export interface DubWindow {
  start: number;
  end: number;
  audioUrl: string;
}

/** Gom các đoạn thoại đã có bản ghi âm thành danh sách "cửa sổ" cần lồng tiếng khi xuất video.
 *  Đoạn nào chưa ghi âm (giữ giọng gốc) không tạo cửa sổ — audio gốc giữ nguyên ở đó. */
export function computeDubWindows(
  characters: DubbingCharacter[],
  recordings: DubbingRecording[],
): DubWindow[] {
  const bySegment = new Map(recordings.map((r) => [r.segmentId, r]));
  const windows: DubWindow[] = [];
  for (const c of characters) {
    for (const seg of c.segments) {
      const rec = bySegment.get(seg.id);
      if (rec) windows.push({ start: seg.startSeconds, end: seg.endSeconds, audioUrl: rec.audioUrl });
    }
  }
  return windows.sort((a, b) => a.start - b.start);
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

function loadFfmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = "/ffmpeg";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

/** Ghép video gốc với các bản ghi âm theo từng đoạn — chỉ audio thay đổi, video track giữ
 *  nguyên (`-c:v copy`). Bản ghi dài hơn khung thời gian gốc bị cắt vừa khung; ngắn hơn được
 *  đệm im lặng — tổng thời lượng video không đổi. */
export async function exportDubbedVideo(
  videoUrl: string,
  windows: DubWindow[],
  onStage?: (stage: string) => void,
): Promise<Blob> {
  onStage?.("Đang tải công cụ xử lý video…");
  const ffmpeg = await loadFfmpeg();

  onStage?.("Đang tải video gốc…");
  await ffmpeg.writeFile("video.mp4", await fetchFile(videoUrl));

  const writtenFiles = ["video.mp4"];
  try {
    if (windows.length === 0) {
      onStage?.("Đang ghép video…");
      const exit = await ffmpeg.exec(["-i", "video.mp4", "-c", "copy", "output.mp4"]);
      if (exit !== 0) throw new Error(`Xuất video thất bại (mã lỗi ${exit})`);
      writtenFiles.push("output.mp4");
      return new Blob([new Uint8Array((await ffmpeg.readFile("output.mp4")) as Uint8Array)], {
        type: "video/mp4",
      });
    }

    onStage?.("Đang tải bản ghi âm…");
    for (let i = 0; i < windows.length; i++) {
      const filename = `win${i}.bin`;
      await ffmpeg.writeFile(filename, await fetchFile(windows[i].audioUrl));
      writtenFiles.push(filename);
    }

    const muteExpr = windows.map((w) => `between(t,${w.start},${w.end})`).join("+");
    const chains: string[] = [
      `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0:enable='${muteExpr}'[origMuted]`,
    ];
    const mixLabels = ["[origMuted]"];
    windows.forEach((w, i) => {
      const dur = w.end - w.start;
      chains.push(
        `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,` +
          `atrim=0:${dur},asetpts=PTS-STARTPTS,apad=whole_dur=${dur},adelay=${w.start}s:all=1[dub${i}]`,
      );
      mixLabels.push(`[dub${i}]`);
    });
    chains.push(`${mixLabels.join("")}amix=inputs=${windows.length + 1}:duration=first:normalize=0[aout]`);

    onStage?.("Đang ghép video…");
    const exit = await ffmpeg.exec([
      "-i",
      "video.mp4",
      ...windows.flatMap((_, i) => ["-i", `win${i}.bin`]),
      "-filter_complex",
      chains.join(";"),
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);
    if (exit !== 0) throw new Error(`Xuất video thất bại (mã lỗi ${exit})`);
    writtenFiles.push("output.mp4");

    return new Blob([new Uint8Array((await ffmpeg.readFile("output.mp4")) as Uint8Array)], {
      type: "video/mp4",
    });
  } finally {
    for (const filename of writtenFiles) {
      try {
        await ffmpeg.deleteFile(filename);
      } catch {
        // dọn dẹp best-effort, bỏ qua nếu file chưa từng được ghi vào ffmpeg virtual FS
      }
    }
  }
}
