import type { WaveformType } from "@morsecodeapp/morse/audio";

export type AudioSettings = {
  /** Character speed (PARIS WPM) */
  wpm: number;
  frequency: number;
  volume: number;
  waveform: WaveformType;
  /** Overall pace with Farnsworth spacing (always slower than `wpm`) */
  farnsworthWpm: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  wpm: 20,
  frequency: 600,
  volume: 80,
  waveform: "sine",
  farnsworthWpm: 15,
};

export const MIN_WPM = 5;
export const MAX_WPM = 40;
export const MIN_FREQ = 200;
export const MAX_FREQ = 2000;
