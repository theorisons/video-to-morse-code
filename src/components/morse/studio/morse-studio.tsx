"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { CheckIcon, ClipboardIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
  const tPlayback = useTranslations("Playback");
  const tFollow = useTranslations("FollowAlong");
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
  const restartingRef = useRef(false);
  const appliedAudioKeyRef = useRef("");

  const encoded = useMemo(() => encodeText(text), [text]);
  const morse = encoded.morse;
  const hasMorse = morse.length > 0;
  const playing = playerState === "playing";
  const audioKey = `${settings.wpm}|${settings.frequency}|${settings.waveform}|${settings.farnsworthWpm}`;

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
          if (restartingRef.current) return;
          setPlayerState("idle");
          clearPlaybackHighlight();
        },
        onEnd: () => {
          // Leave highlights / playhead at the end; only Stop resets.
          setPlayerState("idle");
          setElapsedMs(playerRef.current?.totalTime ?? 0);
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
  }, [clearPlaybackHighlight, disposePlayer, settings]);

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

  // Drop a stale idle/paused player when settings change so the next Play
  // builds a new one. Live playback is restarted by the effect below.
  useEffect(() => {
    if (playerRef.current?.state === "playing") return;
    if (!playerRef.current) return;
    restartingRef.current = true;
    playerRef.current.stop();
    restartingRef.current = false;
    disposePlayer();
    setPlayerState((state) => (state === "paused" ? "idle" : state));
  }, [audioKey, disposePlayer]);

  // Live playback: restart from the start with the new tone/timing.
  useEffect(() => {
    if (playerState !== "playing") return;
    if (appliedAudioKeyRef.current === audioKey) return;
    if (!hasMorse) return;

    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      appliedAudioKeyRef.current = audioKey;
      restartingRef.current = true;
      playerRef.current?.stop();
      playerRef.current?.dispose();
      playerRef.current = null;
      restartingRef.current = false;
      clearPlaybackHighlight();
      const player = createPlayer();
      void player.play(morse, { morse: true });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [
    audioKey,
    playerState,
    hasMorse,
    morse,
    createPlayer,
    clearPlaybackHighlight,
  ]);

  function patchSettings(partial: Partial<AudioSettings>) {
    const next = { ...settings, ...partial };
    const maxFw = Math.max(1, next.wpm - 1);
    next.farnsworthWpm = Math.min(next.farnsworthWpm, maxFw);
    next.farnsworthWpm = Math.max(1, next.farnsworthWpm);
    onSettingsChange(next);
  }

  function applyPreset(name: PresetName) {
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
    if (
      playerRef.current?.state === "paused" &&
      appliedAudioKeyRef.current === audioKey
    ) {
      await playerRef.current.resume();
      return;
    }

    if (
      playerRef.current?.state === "playing" &&
      appliedAudioKeyRef.current === audioKey
    ) {
      return;
    }

    restartingRef.current = true;
    playerRef.current?.stop();
    restartingRef.current = false;
    appliedAudioKeyRef.current = audioKey;
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
            <CardTitle>{t("outputTitle")}</CardTitle>
            <CardDescription>{t("outputDescription")}</CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!hasMorse}
              >
                {copied ? (
                  <CheckIcon data-icon="inline-start" />
                ) : (
                  <ClipboardIcon data-icon="inline-start" />
                )}
                {copied ? tPlayback("copied") : tPlayback("copyMorse")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!hasMorse ? (
              <p className="text-sm text-muted-foreground">{tFollow("empty")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <TextFollowAlong
                  tokens={encoded.textTokens}
                  activeCharIndex={activeCharIndex}
                />
                <MorseFollowAlong
                  morse={morse}
                  activeCharIndex={activeCharIndex}
                  activeSignalIndex={activeSignalIndex}
                />
              </div>
            )}
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
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onDownload={handleDownload}
        />

        <AudioSettingsPanel
          settings={settings}
          onPatchSettings={patchSettings}
          onApplyPreset={applyPreset}
        />
      </div>
    </TooltipProvider>
  );
}
