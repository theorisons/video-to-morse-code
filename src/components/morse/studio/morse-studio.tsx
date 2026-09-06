"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useTranslations } from "next-intl";
import {
  buildSchedule,
  downloadWav,
  MorsePlayer,
  presets,
  scheduleDuration,
  type PresetName,
} from "@morsecodeapp/morse/audio";
import { farnsworthTiming } from "@morsecodeapp/morse/core";
import {
  MorseFollowAlong,
  TextFollowAlong,
} from "@/components/morse/follow-along";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { encodeText } from "@/lib/fold-accents";
import {
  FIXED_VOLUME,
  MAX_FREQ,
  MAX_WPM,
  MIN_FREQ,
  MIN_WPM,
  type AudioSettings,
} from "@/lib/audio-settings";
import { patchMorsePlayerTransport } from "@/lib/patch-morse-player-transport";
import { AudioSettingsPanel } from "./audio-settings";
import {
  BinaryOscilloscope,
  scheduleToBinarySegments,
} from "./oscilloscope";
import { PlaybackControls } from "./playback-controls";

type PlayerUiState = "idle" | "playing" | "paused";

type MorseStudioProps = {
  settings: AudioSettings;
  onSettingsChange: (settings: AudioSettings) => void;
  stopPlaybackRef?: MutableRefObject<(() => void) | null>;
  onBeforePlay?: () => void;
};

export function MorseStudio({
  settings,
  onSettingsChange,
  stopPlaybackRef,
  onBeforePlay,
}: MorseStudioProps) {
  const t = useTranslations("Studio");
  const [text, setText] = useState("");
  const [playerState, setPlayerState] = useState<PlayerUiState>("idle");
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);
  const [activeSignalIndex, setActiveSignalIndex] = useState<number | null>(
    null
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);

  const playerRef = useRef<MorsePlayer | null>(null);
  const signalCountRef = useRef(0);
  const lastCharRef = useRef<number | null>(null);

  const encoded = useMemo(() => encodeText(text), [text]);
  const morse = encoded.morse;
  const hasMorse = morse.length > 0;
  const playing = playerState === "playing";
  const settingsLocked = playing;

  const timings = useMemo(
    () => farnsworthTiming(settings.farnsworthWpm, settings.wpm),
    [settings.farnsworthWpm, settings.wpm]
  );

  const schedule = useMemo(() => {
    if (!hasMorse) return [];
    return buildSchedule(morse, timings);
  }, [hasMorse, morse, timings]);

  const durationMs = useMemo(
    () => (schedule.length === 0 ? 0 : scheduleDuration(schedule)),
    [schedule]
  );

  const binarySegments = useMemo(
    () => scheduleToBinarySegments(schedule),
    [schedule]
  );

  const getPlaybackMs = useCallback(() => {
    return playerRef.current?.currentTime ?? 0;
  }, []);

  const clearPlaybackHighlight = useCallback(() => {
    setActiveCharIndex(null);
    setActiveSignalIndex(null);
    setElapsedMs(0);
    signalCountRef.current = 0;
    lastCharRef.current = null;
  }, []);

  const disposePlayer = useCallback(() => {
    playerRef.current?.dispose();
    playerRef.current = null;
  }, []);

  const createPlayer = useCallback(() => {
    disposePlayer();
    const player = patchMorsePlayerTransport(
      new MorsePlayer({
        wpm: settings.wpm,
        frequency: settings.frequency,
        waveform: settings.waveform,
        volume: FIXED_VOLUME,
        farnsworth: true,
        farnsworthWpm: settings.farnsworthWpm,
        onPlay: () => setPlayerState("playing"),
        onPause: () => setPlayerState("paused"),
        onResume: () => setPlayerState("playing"),
        onStop: () => {
          setPlayerState("idle");
          clearPlaybackHighlight();
        },
        onEnd: () => {
          // Leave highlights / playhead at the end; only Stop resets.
          setPlayerState("idle");
          setElapsedMs(durationMs);
        },
        onSignal: (_signal, charIndex) => {
          if (lastCharRef.current !== charIndex) {
            lastCharRef.current = charIndex;
            signalCountRef.current = 0;
          } else {
            signalCountRef.current += 1;
          }
          setActiveCharIndex(charIndex);
          setActiveSignalIndex(signalCountRef.current);
        },
        onCharacter: (_char, _morseChar, charIndex) => {
          setActiveCharIndex(charIndex);
        },
        onProgress: (currentMs) => {
          setElapsedMs(currentMs);
        },
      })
    );
    playerRef.current = player;
    return player;
  }, [clearPlaybackHighlight, disposePlayer, durationMs, settings]);

  useEffect(() => {
    return () => {
      disposePlayer();
    };
  }, [disposePlayer]);

  useEffect(() => {
    if (!stopPlaybackRef) return;
    stopPlaybackRef.current = () => {
      playerRef.current?.stop();
    };
    return () => {
      stopPlaybackRef.current = null;
    };
  }, [stopPlaybackRef]);

  // Recreate player when settings change (idle only)
  useEffect(() => {
    if (playerState !== "idle") return;
    if (!playerRef.current) return;
    disposePlayer();
  }, [
    settings.wpm,
    settings.frequency,
    settings.waveform,
    settings.farnsworthWpm,
    playerState,
    disposePlayer,
  ]);

  function patchSettings(partial: Partial<AudioSettings>) {
    const next = { ...settings, ...partial };
    const maxFw = Math.max(1, next.wpm - 1);
    next.farnsworthWpm = Math.min(next.farnsworthWpm, maxFw);
    next.farnsworthWpm = Math.max(1, next.farnsworthWpm);
    onSettingsChange(next);
  }

  function applyPreset(name: PresetName) {
    if (settingsLocked) return;
    const preset = presets[name];
    const wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, preset.wpm));
    const maxFw = Math.max(1, wpm - 1);
    const farnsworthWpm = Math.min(
      maxFw,
      Math.max(1, preset.farnsworthWpm ?? Math.min(15, maxFw))
    );
    onSettingsChange({
      wpm,
      frequency: Math.min(MAX_FREQ, Math.max(MIN_FREQ, preset.frequency)),
      waveform: preset.waveform,
      farnsworthWpm,
    });
  }

  async function handlePlay() {
    if (!hasMorse) return;

    onBeforePlay?.();

    // Prefer the player's own state so a stale UI flag can't restart audio.
    if (playerRef.current?.state === "paused") {
      await playerRef.current.resume();
      return;
    }

    if (playerRef.current?.state === "playing") {
      return;
    }

    clearPlaybackHighlight();
    const player = createPlayer();
    await player.play(morse, { morse: true });
  }

  function handlePause() {
    playerRef.current?.pause();
  }

  function handleStop() {
    if (playerRef.current) {
      playerRef.current.stop();
      return;
    }
    setPlayerState("idle");
    clearPlaybackHighlight();
  }

  function handleDownload() {
    if (!hasMorse) return;
    downloadWav(morse, {
      morse: true,
      wpm: settings.wpm,
      frequency: settings.frequency,
      waveform: settings.waveform,
      volume: FIXED_VOLUME,
      farnsworth: true,
      farnsworthWpm: settings.farnsworthWpm,
      filename: "morse.wav",
    });
  }

  async function handleCopy() {
    if (!hasMorse) return;
    await navigator.clipboard.writeText(morse);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="plaintext">{t("plainText")}</Label>
          <Textarea
            id="plaintext"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            className="min-h-[calc(4lh+1rem)] resize-none font-sans"
            disabled={playing}
          />
        </div>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>{t("followTextTitle")}</CardTitle>
            <CardDescription>{t("followTextDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TextFollowAlong
              tokens={encoded.textTokens}
              activeCharIndex={activeCharIndex}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{t("followMorseTitle")}</CardTitle>
                <CardDescription>{t("followMorseDescription")}</CardDescription>
              </div>
              {hasMorse ? (
                <Badge variant="outline">
                  {t("lettersCount", { count: encoded.letters.length })}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <MorseFollowAlong
              morse={morse}
              activeCharIndex={activeCharIndex}
              activeSignalIndex={activeSignalIndex}
            />
          </CardContent>
        </Card>

        <BinaryOscilloscope
          segments={binarySegments}
          unitMs={timings.unit}
          playerState={playerState}
          elapsedMs={elapsedMs}
          getPlaybackMs={getPlaybackMs}
        />

        <PlaybackControls
          hasMorse={hasMorse}
          playing={playing}
          playerState={playerState}
          elapsedMs={elapsedMs}
          durationMs={durationMs}
          copied={copied}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onDownload={handleDownload}
          onCopy={handleCopy}
        />

        <AudioSettingsPanel
          settings={settings}
          settingsLocked={settingsLocked}
          onPatchSettings={patchSettings}
          onApplyPreset={applyPreset}
        />
      </div>
    </TooltipProvider>
  );
}
