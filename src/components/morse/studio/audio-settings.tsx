"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  presets,
  type PresetName,
  type WaveformType,
} from "@morsecodeapp/morse/audio";
import { Button } from "@/components/ui/button";
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
import {
  MAX_FREQ,
  MAX_WPM,
  MIN_FREQ,
  MIN_WPM,
  type AudioSettings,
} from "@/lib/audio-settings";
import { SettingLabel, SettingRow } from "./setting-field";
import { WaveformGlyph } from "./waveform-glyph";

const WAVEFORMS: WaveformType[] = ["sine", "square", "triangle", "sawtooth"];
const PRESET_KEYS = Object.keys(presets) as PresetName[];

function sliderNumber(
  value: number | readonly number[] | undefined
): number | undefined {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

type AudioSettingsPanelProps = {
  settings: AudioSettings;
  settingsLocked: boolean;
  onPatchSettings: (partial: Partial<AudioSettings>) => void;
  onApplyPreset: (name: PresetName) => void;
};

export function AudioSettingsPanel({
  settings,
  settingsLocked,
  onPatchSettings,
  onApplyPreset,
}: AudioSettingsPanelProps) {
  const farnsworthMax = Math.max(1, settings.wpm - 1);

  return (
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
              onClick={() => onApplyPreset(key)}
            >
              {presets[key].name}
            </Button>
          ))}
        </div>
          <p className="text-xs text-muted-foreground">
            Presets fill speed, tone, and waveform.
          </p>
      </div>

      <Collapsible
        defaultOpen={false}
        className="group/audio-settings overflow-hidden rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50">
          <span>Audio settings</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open/audio-settings:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex flex-col gap-5 px-4 py-4">
              <SettingRow
                label="Character speed (WPM)"
                info="How fast each character is sent (PARIS standard). Gaps between characters are stretched so the overall pace matches overall speed."
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
                    if (next !== undefined) onPatchSettings({ wpm: next });
                  }}
                />
              </SettingRow>

              <SettingRow
                label="Overall speed (WPM)"
                info="Effective listening pace. Kept slower than character speed by stretching spacing between characters."
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
                      onPatchSettings({ farnsworthWpm: next });
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
                    if (next !== undefined)
                      onPatchSettings({ frequency: next });
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
                      onPatchSettings({ waveform: value as WaveformType });
                    }
                  }}
                  disabled={settingsLocked}
                >
                  <SelectTrigger id="waveform" className="w-full sm:w-48">
                    <SelectValue>
                      {(value: WaveformType | null) =>
                        value ? (
                          <span className="flex items-center gap-2">
                            <WaveformGlyph type={value} />
                            <span className="capitalize">{value}</span>
                          </span>
                        ) : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {WAVEFORMS.map((wave) => (
                      <SelectItem key={wave} value={wave}>
                        <span className="flex items-center gap-2">
                          <WaveformGlyph type={wave} />
                          <span className="capitalize">{wave}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
