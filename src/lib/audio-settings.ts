import type { WaveformType } from "@morsecodeapp/morse/audio";

/** Fixed loudness for live playback and WAV export (not user-adjustable). */
export const FIXED_VOLUME = 80;

export type AudioSettings = {
  /** Character speed (PARIS WPM) */
  wpm: number;
  frequency: number;
  waveform: WaveformType;
  /** Overall pace with Farnsworth spacing (always slower than `wpm`) */
  farnsworthWpm: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  wpm: 20,
  frequency: 600,
  waveform: "sine",
  farnsworthWpm: 15,
};

export const MIN_WPM = 5;
export const MAX_WPM = 40;
export const MIN_FREQ = 200;
export const MAX_FREQ = 2000;
