"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TextToken } from "@/lib/fold-accents";

export type MorseToken =
  | { type: "letter"; pattern: string; charIndex: number }
  | { type: "sep"; text: string };

/** Split standard Morse (`... --- / .-`) into letter + separator tokens. */
export function tokenizeMorse(morse: string): MorseToken[] {
  const trimmed = morse.trim();
  if (!trimmed) return [];

  const tokens: MorseToken[] = [];
  let charIndex = 0;
  const words = trimmed.split(/\s*\/\s*/);

  for (let wi = 0; wi < words.length; wi++) {
    if (wi > 0) {
      tokens.push({ type: "sep", text: " / " });
    }
    const word = words[wi]?.trim();
    if (!word) continue;
    const letters = word.split(/\s+/).filter(Boolean);
    for (let li = 0; li < letters.length; li++) {
      if (li > 0) {
        tokens.push({ type: "sep", text: " " });
      }
      tokens.push({
        type: "letter",
        pattern: letters[li]!,
        charIndex: charIndex++,
      });
    }
  }

  return tokens;
}

type FollowAlongShellProps = {
  children: ReactNode;
  empty: string;
  isEmpty: boolean;
};

function FollowAlongShell({ children, empty, isEmpty }: FollowAlongShellProps) {
  if (isEmpty) {
    return (
      <p className="text-sm text-muted-foreground">{empty}</p>
    );
  }

  return (
    <div
      className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-base leading-relaxed break-all"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

type TextFollowAlongProps = {
  tokens: TextToken[];
  activeCharIndex: number | null;
};

export function TextFollowAlong({
  tokens,
  activeCharIndex,
}: TextFollowAlongProps) {
  const activeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeCharIndex]);

  return (
    <FollowAlongShell
      isEmpty={tokens.length === 0}
      empty="Type text above — letters will light up here while audio plays."
    >
      <p className="font-sans tracking-wide">
        {tokens.map((token, i) => {
          if (token.type === "space") {
            return (
              <span key={`space-${i}`} className="inline-block w-2">
                {" "}
              </span>
            );
          }

          const isActive = activeCharIndex === token.letter.charIndex;
          return (
            <span
              key={`char-${token.letter.charIndex}`}
              ref={isActive ? activeRef : undefined}
              className={cn(
                "inline rounded px-0.5 transition-colors",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              {token.letter.sourceChar}
            </span>
          );
        })}
      </p>
    </FollowAlongShell>
  );
}

type MorseFollowAlongProps = {
  morse: string;
  activeCharIndex: number | null;
  activeSignalIndex: number | null;
};

export function MorseFollowAlong({
  morse,
  activeCharIndex,
  activeSignalIndex,
}: MorseFollowAlongProps) {
  const tokens = tokenizeMorse(morse);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeCharIndex, activeSignalIndex]);

  return (
    <FollowAlongShell
      isEmpty={!morse.trim()}
      empty="Morse will appear here as you type."
    >
      <p className="font-mono tracking-wide">
        {tokens.map((token, i) => {
          if (token.type === "sep") {
            return (
              <span key={`sep-${i}`} className="text-muted-foreground">
                {token.text}
              </span>
            );
          }

          const isActive = activeCharIndex === token.charIndex;
          return (
            <span
              key={`letter-${token.charIndex}`}
              ref={isActive ? activeRef : undefined}
              className={cn(
                "inline rounded px-0.5 transition-colors",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              {token.pattern.split("").map((sig, si) => {
                const isSignalActive =
                  isActive &&
                  activeSignalIndex !== null &&
                  si === activeSignalIndex;
                return (
                  <span
                    key={si}
                    className={cn(
                      isSignalActive &&
                        "underline decoration-2 underline-offset-2"
                    )}
                  >
                    {sig}
                  </span>
                );
              })}
            </span>
          );
        })}
      </p>
    </FollowAlongShell>
  );
}
