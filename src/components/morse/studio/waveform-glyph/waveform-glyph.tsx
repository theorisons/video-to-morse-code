import type { WaveformType } from "@morsecodeapp/morse/audio";
import type { ComponentType } from "react";
import { SawtoothWave } from "./sawtooth-wave";
import { SineWave } from "./sine-wave";
import { SquareWave } from "./square-wave";
import { TriangleWave } from "./triangle-wave";

const WAVEFORM_COMPONENTS: Record<WaveformType, ComponentType> = {
  sine: SineWave,
  square: SquareWave,
  triangle: TriangleWave,
  sawtooth: SawtoothWave,
};

export function WaveformGlyph({ type }: { type: WaveformType }) {
  const Wave = WAVEFORM_COMPONENTS[type];
  return <Wave />;
}
