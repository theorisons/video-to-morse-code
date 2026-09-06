import type { ScheduleEvent } from "@morsecodeapp/morse/audio";

export type BinarySegment = {
  startMs: number;
  durationMs: number;
  level: 0 | 1;
};

/** Map a Morse tone/silence schedule to a binary on/off envelope. */
export function scheduleToBinarySegments(
  events: ScheduleEvent[]
): BinarySegment[] {
  return events.map((event) => ({
    startMs: event.start,
    durationMs: event.duration,
    level: event.type === "tone" ? 1 : 0,
  }));
}

/** Amplitude of the binary envelope at `timeMs` (0 outside the schedule). */
export function levelAt(segments: BinarySegment[], timeMs: number): 0 | 1 {
  if (segments.length === 0 || timeMs < 0) return 0;
  for (const segment of segments) {
    const end = segment.startMs + segment.durationMs;
    if (timeMs >= segment.startMs && timeMs < end) {
      return segment.level;
    }
  }
  return 0;
}
