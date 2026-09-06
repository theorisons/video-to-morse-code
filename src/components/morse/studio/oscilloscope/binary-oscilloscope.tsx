"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { BinarySegment } from "./binary-segments";
import { levelAt } from "./binary-segments";

const VISIBLE_UNITS = 28;
const PLAYHEAD_RATIO = 0.3;

type PlayerUiState = "idle" | "playing" | "paused";

type BinaryOscilloscopeProps = {
  segments: BinarySegment[];
  unitMs: number;
  playerState: PlayerUiState;
  /** Frozen time when paused/idle; used as fallback while playing. */
  elapsedMs: number;
  /** Live clock while playing (e.g. player.currentTime). */
  getPlaybackMs?: () => number;
};

function resolveTimeMs(
  playerState: PlayerUiState,
  elapsedMs: number,
  getPlaybackMs?: () => number
): number {
  if (playerState === "idle") return 0;
  if (playerState === "playing" && getPlaybackMs) {
    return Math.max(0, getPlaybackMs());
  }
  return Math.max(0, elapsedMs);
}

function drawScope(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  segments: BinarySegment[],
  unitMs: number,
  playheadMs: number
) {
  const padX = 12;
  const padY = 16;
  const plotW = Math.max(1, width - padX * 2);
  const plotH = Math.max(1, height - padY * 2);

  const yOff = padY + plotH * 0.78;
  const yOn = padY + plotH * 0.22;
  const safeUnit = Math.max(unitMs, 1);
  const windowMs = VISIBLE_UNITS * safeUnit;
  const playheadX = padX + plotW * PLAYHEAD_RATIO;
  const windowStartMs = playheadMs - PLAYHEAD_RATIO * windowMs;
  const msToX = (ms: number) =>
    padX + ((ms - windowStartMs) / windowMs) * plotW;
  const levelToY = (level: 0 | 1) => (level === 1 ? yOn : yOff);

  // CRT background
  ctx.fillStyle = "#0a0f0a";
  ctx.fillRect(0, 0, width, height);

  // Soft vignette / phosphor glow plate
  const plate = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    4,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7
  );
  plate.addColorStop(0, "#122018");
  plate.addColorStop(1, "#050805");
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, width, height);

  // Unit grid
  ctx.save();
  ctx.beginPath();
  ctx.rect(padX, padY, plotW, plotH);
  ctx.clip();

  const firstUnit = Math.floor(windowStartMs / safeUnit);
  const lastUnit = Math.ceil((windowStartMs + windowMs) / safeUnit);
  for (let u = firstUnit; u <= lastUnit; u++) {
    const x = msToX(u * safeUnit);
    const major = u % 5 === 0;
    ctx.strokeStyle = major ? "rgba(80, 200, 120, 0.22)" : "rgba(60, 140, 90, 0.12)";
    ctx.lineWidth = major ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, padY);
    ctx.lineTo(x, padY + plotH);
    ctx.stroke();
  }

  // Horizontal rails for 0 / 1
  for (const y of [yOff, yOn]) {
    ctx.strokeStyle = "rgba(80, 200, 120, 0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(padX + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Labels
  ctx.fillStyle = "rgba(120, 220, 150, 0.55)";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.fillText("1", padX + 2, yOn - 4);
  ctx.fillText("0", padX + 2, yOff + 12);

  // Square-wave trace
  const windowEndMs = windowStartMs + windowMs;
  let level: 0 | 1 = levelAt(segments, windowStartMs);

  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#5dff9a";
  ctx.shadowColor = "rgba(60, 255, 140, 0.55)";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(msToX(windowStartMs), levelToY(level));

  if (segments.length === 0) {
    ctx.lineTo(msToX(windowEndMs), levelToY(0));
  } else {
    for (const segment of segments) {
      const segStart = segment.startMs;
      const segEnd = segment.startMs + segment.durationMs;
      if (segEnd <= windowStartMs) continue;
      if (segStart >= windowEndMs) break;

      // Rising/falling edge at segment start when inside the window
      if (segStart > windowStartMs && segment.level !== level) {
        const x = msToX(segStart);
        ctx.lineTo(x, levelToY(level));
        ctx.lineTo(x, levelToY(segment.level));
        level = segment.level;
      } else {
        level = segment.level;
      }

      ctx.lineTo(msToX(Math.min(segEnd, windowEndMs)), levelToY(level));
    }
    ctx.lineTo(msToX(windowEndMs), levelToY(level));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Playhead
  ctx.strokeStyle = "rgba(255, 220, 80, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, padY);
  ctx.lineTo(playheadX, padY + plotH);
  ctx.stroke();

  // Playhead tip
  ctx.fillStyle = "rgba(255, 220, 80, 0.9)";
  ctx.beginPath();
  ctx.moveTo(playheadX, padY);
  ctx.lineTo(playheadX - 4, padY - 6);
  ctx.lineTo(playheadX + 4, padY - 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Bezel scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}

export function BinaryOscilloscope({
  segments,
  unitMs,
  playerState,
  elapsedMs,
  getPlaybackMs,
}: BinaryOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef(segments);
  const unitMsRef = useRef(unitMs);
  const playerStateRef = useRef(playerState);
  const elapsedMsRef = useRef(elapsedMs);
  const getPlaybackMsRef = useRef(getPlaybackMs);

  useLayoutEffect(() => {
    segmentsRef.current = segments;
    unitMsRef.current = unitMs;
    playerStateRef.current = playerState;
    elapsedMsRef.current = elapsedMs;
    getPlaybackMsRef.current = getPlaybackMs;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let rafId = 0;
    let disposed = false;

    const paint = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = wrapper.clientWidth;
      const cssH = wrapper.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;

      if (
        canvas.width !== Math.round(cssW * dpr) ||
        canvas.height !== Math.round(cssH * dpr)
      ) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = resolveTimeMs(
        playerStateRef.current,
        elapsedMsRef.current,
        getPlaybackMsRef.current
      );
      drawScope(
        ctx,
        cssW,
        cssH,
        segmentsRef.current,
        unitMsRef.current,
        t
      );
    };

    const loop = () => {
      paint();
      if (playerStateRef.current === "playing") {
        rafId = requestAnimationFrame(loop);
      }
    };

    paint();
    if (playerState === "playing") {
      rafId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      paint();
    });
    ro.observe(wrapper);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
    // elapsedMs / getPlaybackMs are read via refs; only restart the loop
    // when play state or the plotted signal changes.
  }, [playerState, segments, unitMs]);

  // Redraw once when paused/idle time updates without restarting rAF.
  useEffect(() => {
    if (playerState === "playing") return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = wrapper.clientWidth;
    const cssH = wrapper.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScope(
      ctx,
      cssW,
      cssH,
      segmentsRef.current,
      unitMsRef.current,
      resolveTimeMs(playerState, elapsedMs, getPlaybackMs)
    );
  }, [elapsedMs, playerState, getPlaybackMs]);

  return (
    <div
      className="rounded-lg shadow-[0_0_0_1px_rgba(40,80,50,0.55),0_0_12px_rgba(60,255,140,0.28),0_0_28px_rgba(60,255,140,0.12)]"
      role="img"
      aria-label="Binary Morse oscilloscope showing on and off signal levels"
    >
      <div
        ref={wrapperRef}
        className="relative h-40 w-full overflow-hidden rounded-lg bg-[#0a0f0a] shadow-[inset_0_0_0_1px_rgba(40,80,50,0.75),inset_0_0_18px_rgba(60,255,140,0.08)]"
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>
    </div>
  );
}
