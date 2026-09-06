"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { MorsePlayer } from "@morsecodeapp/morse/audio";
import { itu } from "@morsecodeapp/morse/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AudioSettings } from "@/lib/audio-settings";
import { cn } from "@/lib/utils";

type MorseEntry = {
  char: string;
  morse: string;
};

function isLetter(char: string): boolean {
  return /^[A-Z]$/.test(char);
}

function isDigit(char: string): boolean {
  return /^[0-9]$/.test(char);
}

function sortEntries(a: MorseEntry, b: MorseEntry): number {
  if (isLetter(a.char) && isLetter(b.char)) return a.char.localeCompare(b.char);
  if (isDigit(a.char) && isDigit(b.char)) return a.char.localeCompare(b.char);
  if (isLetter(a.char)) return -1;
  if (isLetter(b.char)) return 1;
  if (isDigit(a.char)) return -1;
  if (isDigit(b.char)) return 1;
  return a.char.localeCompare(b.char);
}

const ITU_ENTRIES: MorseEntry[] = Object.entries(itu.charToMorse)
  .map(([char, morse]) => ({ char, morse }))
  .sort(sortEntries);

type MorseAlphabetListProps = {
  entries: MorseEntry[];
  activeChar: string | null;
  onPlayChar: (char: string, morse: string) => void;
};

function MorseAlphabetList({
  entries,
  activeChar,
  onPlayChar,
}: MorseAlphabetListProps) {
  const letters = entries.filter((e) => isLetter(e.char));
  const digits = entries.filter((e) => isDigit(e.char));
  const punctuation = entries.filter(
    (e) => !isLetter(e.char) && !isDigit(e.char)
  );

  const rows = [
    ...letters.map((entry) => ({ ...entry, sectionStart: false })),
    ...digits.map((entry, i) => ({ ...entry, sectionStart: i === 0 })),
    ...punctuation.map((entry, i) => ({ ...entry, sectionStart: i === 0 })),
  ];

  return (
    <div className="grid w-max grid-cols-[auto_auto] gap-x-5 gap-y-0.5">
      {rows.map(({ char, morse, sectionStart }) => {
        const isActive = activeChar === char;
        return (
          <button
            key={char}
            type="button"
            onClick={() => onPlayChar(char, morse)}
            aria-label={`Play Morse for ${char}`}
            className={cn(
              "col-span-2 grid cursor-pointer grid-cols-subgrid items-baseline rounded-md py-1 text-left transition-colors hover:bg-muted/60",
              sectionStart && "mt-2 border-t border-border pt-3",
              isActive && "bg-primary/10"
            )}
          >
            <span className="pl-0.5 text-muted-foreground tabular-nums">
              {char}
            </span>
            <span className="pr-0.5 font-mono text-base font-semibold tracking-widest text-foreground">
              {morse}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type MorseReferencePanelProps = {
  settings: AudioSettings;
  onBeforePlay?: () => void;
  stopPlaybackRef?: MutableRefObject<(() => void) | null>;
};

export function MorseReferencePanel({
  settings,
  onBeforePlay,
  stopPlaybackRef,
}: MorseReferencePanelProps) {
  const playerRef = useRef<MorsePlayer | null>(null);
  const [activeChar, setActiveChar] = useState<string | null>(null);

  useEffect(() => {
    const stop = () => {
      playerRef.current?.stop();
      playerRef.current?.dispose();
      playerRef.current = null;
      setActiveChar(null);
    };

    if (stopPlaybackRef) {
      stopPlaybackRef.current = stop;
    }

    return () => {
      stop();
      if (stopPlaybackRef) {
        stopPlaybackRef.current = null;
      }
    };
  }, [stopPlaybackRef]);

  async function playChar(char: string, morse: string) {
    onBeforePlay?.();

    playerRef.current?.stop();
    playerRef.current?.dispose();
    playerRef.current = null;

    const player = new MorsePlayer({
      wpm: settings.wpm,
      frequency: settings.frequency,
      waveform: settings.waveform,
      volume: settings.volume,
      farnsworth: true,
      farnsworthWpm: settings.farnsworthWpm,
      onEnd: () => {
        playerRef.current?.dispose();
        playerRef.current = null;
        setActiveChar(null);
      },
      onStop: () => {
        setActiveChar(null);
      },
    });
    playerRef.current = player;
    setActiveChar(char);
    await player.play(morse, { morse: true });
  }

  return (
    <aside className="w-max lg:sticky lg:top-6 lg:self-start">
      <Card size="sm" className="w-max gap-0 overflow-hidden py-0">
        <CardHeader className="shrink-0 bg-muted px-3 py-1.5">
          <CardTitle className="w-full text-center text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[min(70vh,36rem)] overflow-y-auto px-2 py-2 pr-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MorseAlphabetList
            entries={ITU_ENTRIES}
            activeChar={activeChar}
            onPlayChar={playChar}
          />
        </CardContent>
      </Card>
    </aside>
  );
}
