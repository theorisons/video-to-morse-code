"use client";

import {
  CheckIcon,
  ClipboardIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** Seconds with always three millisecond digits, e.g. 0.000s / 2.880s */
function formatExactSeconds(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(3)}s`;
}

type PlayerUiState = "idle" | "playing" | "paused";

type PlaybackControlsProps = {
  hasMorse: boolean;
  playing: boolean;
  playerState: PlayerUiState;
  elapsedMs: number;
  durationMs: number;
  copied: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDownload: () => void;
  onCopy: () => void;
};

export function PlaybackControls({
  hasMorse,
  playing,
  playerState,
  elapsedMs,
  durationMs,
  copied,
  onPlay,
  onPause,
  onStop,
  onDownload,
  onCopy,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Time</span>
        <span className="font-mono tabular-nums">
          {hasMorse
            ? `${formatExactSeconds(elapsedMs)} / ${formatExactSeconds(durationMs)}`
            : "—"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {playing ? (
          <Button type="button" onClick={onPause} disabled={!hasMorse}>
            <PauseIcon data-icon="inline-start" />
            Pause
          </Button>
        ) : (
          <Button type="button" onClick={onPlay} disabled={!hasMorse}>
            <PlayIcon data-icon="inline-start" />
            {playerState === "paused" ? "Resume" : "Play"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onStop}
          disabled={playerState === "idle"}
        >
          <SquareIcon data-icon="inline-start" />
          Stop
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDownload}
          disabled={!hasMorse}
        >
          <DownloadIcon data-icon="inline-start" />
          Download WAV
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCopy}
          disabled={!hasMorse}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <ClipboardIcon data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy Morse"}
        </Button>
      </div>
    </div>
  );
}
