"use client";

import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Compact clock: YYsZZZ, plus XXm / XXh when needed (e.g. 03m02s099). */
function formatExactDuration(ms: number, scaleMs = ms): string {
  const totalMs = Math.max(0, Math.round(ms));
  const scale = Math.max(0, Math.round(scaleMs));
  const hours = Math.floor(totalMs / MS_PER_HOUR);
  const minutes = Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND);
  const millis = totalMs % MS_PER_SECOND;
  const secondsDisplay = pad(seconds, 1);
  const millisDisplay = pad(millis, 3);

  if (scale >= MS_PER_HOUR) {
    return `${pad(hours, 1)}h${pad(minutes, 1)}m${secondsDisplay}s${millisDisplay}`;
  }
  if (scale >= MS_PER_MINUTE) {
    return `${pad(minutes, 1)}m${secondsDisplay}s${millisDisplay}`;
  }
  return `${secondsDisplay}.${millisDisplay}s`;
}

type PlayerUiState = "idle" | "playing" | "paused";

type PlaybackControlsProps = {
  hasMorse: boolean;
  playing: boolean;
  playerState: PlayerUiState;
  elapsedMs: number;
  durationMs: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDownload: () => void;
};

export function PlaybackControls({
  hasMorse,
  playing,
  playerState,
  elapsedMs,
  durationMs,
  onPlay,
  onPause,
  onStop,
  onDownload,
}: PlaybackControlsProps) {
  const t = useTranslations("Playback");
  const scaleMs = Math.max(elapsedMs, durationMs);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t("time")}</span>
        <span className="font-mono tabular-nums">
          {hasMorse
            ? `${formatExactDuration(elapsedMs, scaleMs)} / ${formatExactDuration(durationMs, scaleMs)}`
            : "—"}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {playing ? (
            <Button type="button" onClick={onPause} disabled={!hasMorse}>
              <PauseIcon data-icon="inline-start" />
              {t("pause")}
            </Button>
          ) : (
            <Button type="button" onClick={onPlay} disabled={!hasMorse}>
              <PlayIcon data-icon="inline-start" />
              {playerState === "paused" ? t("resume") : t("play")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onStop}
            disabled={playerState === "idle" && elapsedMs <= 0}
          >
            <SquareIcon data-icon="inline-start" />
            {t("stop")}
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onDownload}
          disabled={!hasMorse}
        >
          <DownloadIcon data-icon="inline-start" />
          {t("downloadWav")}
        </Button>
      </div>
    </div>
  );
}
