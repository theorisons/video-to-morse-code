"use client";

import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
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
const PRESET_KEYS: PresetName[] = [
  "military",
  "naval",
  "telegraph",
  "radio",
  "sonar",
];

function sliderNumber(
  value: number | readonly number[] | undefined
): number | undefined {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

type AudioSettingsPanelProps = {
  settings: AudioSettings;
  onPatchSettings: (partial: Partial<AudioSettings>) => void;
  onApplyPreset: (name: PresetName) => void;
};

export function AudioSettingsPanel({
  settings,
  onPatchSettings,
  onApplyPreset,
}: AudioSettingsPanelProps) {
  const t = useTranslations("Settings");
  const farnsworthMax = Math.max(1, settings.wpm - 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{t("soundPreset")}</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onApplyPreset(key)}
            >
              {t(`presets.${key}`)}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("presetsHint")}</p>
      </div>

      <Collapsible
        defaultOpen={false}
        className="group/audio-settings overflow-hidden rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50">
          <span>{t("audioSettings")}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open/audio-settings:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex flex-col gap-5 px-4 py-4">
              <SettingRow
                label={t("characterSpeed")}
                info={t("characterSpeedInfo")}
                valueLabel={t("wpmValue", { value: settings.wpm })}
              >
                <Slider
                  min={MIN_WPM}
                  max={MAX_WPM}
                  step={1}
                  value={[settings.wpm]}
                  onValueChange={(value) => {
                    const next = sliderNumber(value);
                    if (next !== undefined) onPatchSettings({ wpm: next });
                  }}
                />
              </SettingRow>

              <SettingRow
                label={t("overallSpeed")}
                info={t("overallSpeedInfo")}
                valueLabel={t("wpmValue", { value: settings.farnsworthWpm })}
              >
                <Slider
                  min={1}
                  max={farnsworthMax}
                  step={1}
                  value={[Math.min(settings.farnsworthWpm, farnsworthMax)]}
                  onValueChange={(value) => {
                    const next = sliderNumber(value);
                    if (next !== undefined)
                      onPatchSettings({ farnsworthWpm: next });
                  }}
                />
              </SettingRow>

              <SettingRow
                label={t("toneFrequency")}
                info={t("toneFrequencyInfo")}
                valueLabel={t("hzValue", { value: settings.frequency })}
              >
                <Slider
                  min={MIN_FREQ}
                  max={MAX_FREQ}
                  step={10}
                  value={[settings.frequency]}
                  onValueChange={(value) => {
                    const next = sliderNumber(value);
                    if (next !== undefined)
                      onPatchSettings({ frequency: next });
                  }}
                />
              </SettingRow>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <SettingLabel htmlFor="waveform" info={t("waveformInfo")}>
                  {t("waveform")}
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
                >
                  <SelectTrigger id="waveform" className="w-full sm:w-48">
                    <SelectValue>
                      {(value: WaveformType | null) =>
                        value ? (
                          <span className="flex items-center gap-2">
                            <WaveformGlyph type={value} />
                            <span>{t(`waveforms.${value}`)}</span>
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
                          <span>{t(`waveforms.${wave}`)}</span>
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
