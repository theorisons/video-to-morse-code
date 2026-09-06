"use client";

import { MorseReferencePanel } from "@/components/morse-reference-panel";
import { MorseStudio } from "@/components/morse-studio";

export function MorseApp() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Morse code generator
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Type text, follow the Morse as it plays, tweak audio settings, and
          download a WAV. Everything runs in your browser — nothing is uploaded.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
        <MorseStudio />
        <MorseReferencePanel />
      </div>
    </div>
  );
}
