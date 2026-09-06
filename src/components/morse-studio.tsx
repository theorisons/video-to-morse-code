"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DownloadIcon,
  InfoIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react";
import {
  buildSchedule,
  downloadWav,
  MorsePlayer,
  presets,
  scheduleDuration,
  type PresetName,
  type WaveformType,
} from "@morsecodeapp/morse/audio";
import {
  farnsworthTiming,
  timing,
} from "@morsecodeapp/morse/core";
import {
  MorseFollowAlong,
  TextFollowAlong,
} from "@/components/morse-follow-along";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { encodeText } from "@/lib/fold-accents";

const MIN_WPM = 5;
const MAX_WPM = 40;
const MIN_FREQ = 200;
const MAX_FREQ = 2000;
const WAVEFORMS: WaveformType[] = ["sine", "square", "triangle", "sawtooth"];
const PRESET_KEYS = Object.keys(presets) as PresetName[];

type PlayerUiState = "idle" | "playing" | "paused";

type AudioSettings = {
  wpm: number;
  frequency: number;
  volume: number;
  waveform: WaveformType;
  farnsworth: boolean;
  farnsworthWpm: number;
};

const DEFAULT_SETTINGS: AudioSettings = {
  wpm: 20,
  frequency: 600,
  volume: 80,
  waveform: "sine",
  farnsworth: false,
  farnsworthWpm: 15,
};

function sliderNumber(
  value: number | readonly number[] | undefined
): number | undefined {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/** Seconds with always three millisecond digits, e.g. 0.000s / 2.880s */
function formatExactSeconds(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(3)}s`;
}

export function MorseStudio() {
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
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

  const durationMs = useMemo(() => {
    if (!hasMorse) return 0;
    const t = settings.farnsworth
      ? farnsworthTiming(settings.farnsworthWpm, settings.wpm)
      : timing(settings.wpm);
    return scheduleDuration(buildSchedule(morse, t));
  }, [hasMorse, morse, settings.farnsworth, settings.farnsworthWpm, settings.wpm]);

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
    const player = new MorsePlayer({
      wpm: settings.wpm,
      frequency: settings.frequency,
      waveform: settings.waveform,
      volume: settings.volume,
      farnsworth: settings.farnsworth,
      farnsworthWpm: settings.farnsworthWpm,
      onPlay: () => setPlayerState("playing"),
      onPause: () => setPlayerState("paused"),
      onResume: () => setPlayerState("playing"),
      onStop: () => {
        setPlayerState("idle");
        clearPlaybackHighlight();
      },
      onEnd: () => {
        setPlayerState("idle");
        clearPlaybackHighlight();
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
    });
    playerRef.current = player;
    return player;
  }, [clearPlaybackHighlight, disposePlayer, settings]);

  useEffect(() => {
    return () => {
      disposePlayer();
    };
  }, [disposePlayer]);

  // Live volume while playing; recreate player when other settings change (idle only)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.volume = settings.volume;
  }, [settings.volume]);

  useEffect(() => {
    if (playerState !== "idle") return;
    if (!playerRef.current) return;
    disposePlayer();
  }, [
    settings.wpm,
    settings.frequency,
    settings.waveform,
    settings.farnsworth,
    settings.farnsworthWpm,
    playerState,
    disposePlayer,
  ]);

  function patchSettings(partial: Partial<AudioSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (next.farnsworth) {
        const maxFw = Math.max(1, next.wpm - 1);
        next.farnsworthWpm = Math.min(next.farnsworthWpm, maxFw);
        next.farnsworthWpm = Math.max(1, next.farnsworthWpm);
      }
      return next;
    });
  }

  function applyPreset(name: PresetName) {
    if (settingsLocked) return;
    const preset = presets[name];
    setSettings({
      wpm: Math.min(MAX_WPM, Math.max(MIN_WPM, preset.wpm)),
      frequency: Math.min(MAX_FREQ, Math.max(MIN_FREQ, preset.frequency)),
      volume: preset.volume,
      waveform: preset.waveform,
      farnsworth: preset.farnsworth ?? false,
      farnsworthWpm: preset.farnsworthWpm ?? 15,
    });
  }

  async function handlePlay() {
    if (!hasMorse) return;

    if (playerState === "paused" && playerRef.current) {
      await playerRef.current.resume();
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
    playerRef.current?.stop();
  }

  function handleDownload() {
    if (!hasMorse) return;
    downloadWav(morse, {
      morse: true,
      wpm: settings.wpm,
      frequency: settings.frequency,
      waveform: settings.waveform,
      volume: settings.volume,
      farnsworth: settings.farnsworth,
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

  const farnsworthMax = Math.max(1, settings.wpm - 1);

  return (
    <TooltipProvider delay={200}>
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="plaintext">Plain text</Label>
        <Textarea
          id="plaintext"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text… Accents like é, è fold to e for Morse."
          className="min-h-32 resize-y font-sans"
          disabled={playing}
        />
      </div>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Follow along — text</CardTitle>
          <CardDescription>
            Highlights the letter currently playing (accents kept).
          </CardDescription>
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
              <CardTitle>Follow along — Morse</CardTitle>
              <CardDescription>
                Live ITU Morse. Accented letters fold to their base form.
              </CardDescription>
            </div>
            {hasMorse ? (
              <Badge variant="outline">{encoded.letters.length} letters</Badge>
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
            <Button type="button" onClick={handlePause} disabled={!hasMorse}>
              <PauseIcon data-icon="inline-start" />
              Pause
            </Button>
          ) : (
            <Button type="button" onClick={handlePlay} disabled={!hasMorse}>
              <PlayIcon data-icon="inline-start" />
              {playerState === "paused" ? "Resume" : "Play"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleStop}
            disabled={playerState === "idle"}
          >
            <SquareIcon data-icon="inline-start" />
            Stop
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownload}
            disabled={!hasMorse}
          >
            <DownloadIcon data-icon="inline-start" />
            Download WAV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Sound preset</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant="outline"
                disabled={settingsLocked}
                onClick={() => applyPreset(key)}
              >
                {presets[key].name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Presets fill speed, tone, waveform, volume, and Farnsworth.
          </p>
        </div>

        <Collapsible
          defaultOpen={false}
          className="group/audio-settings overflow-hidden rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
        >
          <CollapsibleTrigger
            className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <span>Audio settings</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open/audio-settings:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border">
              <div className="flex flex-col gap-5 px-4 py-4">
                <SettingRow
                  label="Speed (WPM)"
                  info="Words per minute using the PARIS standard. Higher values play Morse faster and shorten the total duration."
                  valueLabel={`${settings.wpm} WPM`}
                >
                  <Slider
                    min={MIN_WPM}
                    max={MAX_WPM}
                    step={1}
                    value={[settings.wpm]}
                    disabled={settingsLocked}
                    onValueChange={(value) => {
                      const next = sliderNumber(value);
                      if (next !== undefined) patchSettings({ wpm: next });
                    }}
                  />
                </SettingRow>

                <SettingRow
                  label="Tone frequency"
                  info="Pitch of the Morse tone in hertz. Typical practice tones sit around 500–800 Hz."
                  valueLabel={`${settings.frequency} Hz`}
                >
                  <Slider
                    min={MIN_FREQ}
                    max={MAX_FREQ}
                    step={10}
                    value={[settings.frequency]}
                    disabled={settingsLocked}
                    onValueChange={(value) => {
                      const next = sliderNumber(value);
                      if (next !== undefined) patchSettings({ frequency: next });
                    }}
                  />
                </SettingRow>

                <SettingRow
                  label="Volume"
                  info="Loudness for live playback and the exported WAV. Volume can still change while audio is playing."
                  valueLabel={`${settings.volume}%`}
                >
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[settings.volume]}
                    onValueChange={(value) => {
                      const next = sliderNumber(value);
                      if (next !== undefined) patchSettings({ volume: next });
                    }}
                  />
                </SettingRow>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SettingLabel
                    htmlFor="waveform"
                    info="Shape of the oscillator that generates the tone. Sine is the cleanest; square, triangle, and sawtooth sound more textured."
                  >
                    Waveform
                  </SettingLabel>
                  <Select
                    value={settings.waveform}
                    onValueChange={(value) => {
                      if (
                        typeof value === "string" &&
                        WAVEFORMS.includes(value as WaveformType)
                      ) {
                        patchSettings({ waveform: value as WaveformType });
                      }
                    }}
                    disabled={settingsLocked}
                  >
                    <SelectTrigger id="waveform" className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAVEFORMS.map((wave) => (
                        <SelectItem key={wave} value={wave}>
                          {wave}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <SettingLabel
                    htmlFor="farnsworth"
                    info="Sends characters at the character WPM while stretching gaps so the overall pace is slower. Useful when learning Morse."
                  >
                    Farnsworth spacing
                  </SettingLabel>
                  <Switch
                    id="farnsworth"
                    checked={settings.farnsworth}
                    disabled={settingsLocked}
                    onCheckedChange={(checked) =>
                      patchSettings({ farnsworth: checked })
                    }
                  />
                </div>

                {settings.farnsworth ? (
                  <SettingRow
                    label="Farnsworth overall WPM"
                    info="Target overall speed when Farnsworth is on. Must stay slower than the character WPM above."
                    valueLabel={`${settings.farnsworthWpm} WPM`}
                  >
                    <Slider
                      min={1}
                      max={farnsworthMax}
                      step={1}
                      value={[Math.min(settings.farnsworthWpm, farnsworthMax)]}
                      disabled={settingsLocked}
                      onValueChange={(value) => {
                        const next = sliderNumber(value);
                        if (next !== undefined)
                          patchSettings({ farnsworthWpm: next });
                      }}
                    />
                  </SettingRow>
                ) : null}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
    </TooltipProvider>
  );
}

function SettingLabel({
  children,
  info,
  htmlFor,
}: {
  children: ReactNode;
  info: string;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`About ${typeof children === "string" ? children : "this setting"}`}
        >
          <InfoIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-pretty">
          {info}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function SettingRow({
  label,
  info,
  valueLabel,
  children,
}: {
  label: string;
  info: string;
  valueLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <SettingLabel info={info}>{label}</SettingLabel>
        <Badge variant="secondary">{valueLabel}</Badge>
      </div>
      {children}
    </div>
  );
}
