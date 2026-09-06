"use client";

import { useRef, useState } from "react";
import { MorseReferencePanel } from "./reference";
import { MorseStudio } from "./studio";
import {
  DEFAULT_AUDIO_SETTINGS,
  type AudioSettings,
} from "@/lib/audio-settings";
import { ThemeToggle } from "@/components/theme-toggle";

export function MorseApp() {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const stopMainRef = useRef<(() => void) | null>(null);
  const stopPreviewRef = useRef<(() => void) | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Morse code generator
        </h1>
        <ThemeToggle className="shrink-0" />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
        <MorseStudio
          settings={settings}
          onSettingsChange={setSettings}
          stopPlaybackRef={stopMainRef}
          onBeforePlay={() => stopPreviewRef.current?.()}
        />
        <MorseReferencePanel
          settings={settings}
          stopPlaybackRef={stopPreviewRef}
          onBeforePlay={() => stopMainRef.current?.()}
        />
      </div>
    </div>
  );
}
