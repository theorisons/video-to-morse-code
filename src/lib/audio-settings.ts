import type { WaveformType } from "@morsecodeapp/morse/audio";

export type AudioSettings = {
  wpm: number;
  frequency: number;
  volume: number;
  waveform: WaveformType;
  farnsworth: boolean;
  farnsworthWpm: number;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  wpm: 20,
  frequency: 600,
  volume: 80,
  waveform: "sine",
  farnsworth: false,
  farnsworthWpm: 15,
};

export const MIN_WPM = 5;
export const MAX_WPM = 40;
export const MIN_FREQ = 200;
export const MAX_FREQ = 2000;
