"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useTranslations } from "next-intl";
import { MorsePlayer } from "@morsecodeapp/morse/audio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FIXED_VOLUME, type AudioSettings } from "@/lib/audio-settings";
import { ITU_ENTRIES, MorseAlphabetList } from "./morse-alphabet-list";

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
  const t = useTranslations("Reference");
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
      volume: FIXED_VOLUME,
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
            {t("title")}
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
