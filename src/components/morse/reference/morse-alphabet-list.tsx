"use client";

import { Fragment } from "react";
import { itu } from "@morsecodeapp/morse/core";
import { useTranslations } from "next-intl";
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

export const ITU_ENTRIES: MorseEntry[] = Object.entries(itu.charToMorse)
  .map(([char, morse]) => ({ char, morse }))
  .sort(sortEntries);

type MorseAlphabetListProps = {
  entries: MorseEntry[];
  activeChar: string | null;
  onPlayChar: (char: string, morse: string) => void;
};

export function MorseAlphabetList({
  entries,
  activeChar,
  onPlayChar,
}: MorseAlphabetListProps) {
  const t = useTranslations("Reference");
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
    <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] lg:w-max lg:grid-cols-[auto_auto] lg:gap-x-5">
      {rows.map(({ char, morse, sectionStart }) => {
        const isActive = activeChar === char;
        return (
          <Fragment key={char}>
            {sectionStart ? (
              <div
                aria-hidden
                className="col-span-5 my-1.5 h-px bg-border lg:col-span-2 lg:my-2"
              />
            ) : null}
            <button
              type="button"
              onClick={() => onPlayChar(char, morse)}
              aria-label={t("playChar", { char })}
              className={cn(
                "col-span-5 grid cursor-pointer grid-cols-subgrid items-baseline rounded-md py-0.5 text-centered transition-colors hover:bg-muted/60 lg:col-span-2 lg:py-1",
                isActive && "bg-primary/10"
              )}
            >
              <span className="col-start-2 text-muted-foreground tabular-nums lg:col-start-1">
                {char}
              </span>
              <span className="col-start-4 font-mono text-base font-semibold tracking-widest text-foreground lg:col-start-2">
                {morse}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
