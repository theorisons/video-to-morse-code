"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FollowAlongShell } from "./follow-along-shell";
import { tokenizeMorse } from "./tokenize-morse";

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
