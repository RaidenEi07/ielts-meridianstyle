"use client";

import { SegmentDubbingRecorder } from "@/components/kids/SegmentDubbingRecorder";
import type { DubbingCharacter, DubbingRecording } from "@/lib/types";

export function CharacterDubbingRecorder({
  character,
  token,
  recordings,
  onChange,
}: {
  character: DubbingCharacter;
  token: string;
  recordings: DubbingRecording[];
  onChange: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 font-semibold">{character.name}</p>

      <div className="space-y-3">
        {character.segments.map((segment) => (
          <SegmentDubbingRecorder
            key={segment.id}
            segment={segment}
            token={token}
            recording={recordings.find((r) => r.segmentId === segment.id) ?? null}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
