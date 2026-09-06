"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TextToken } from "@/lib/fold-accents";
import { FollowAlongShell } from "./follow-along-shell";

type TextFollowAlongProps = {
  tokens: TextToken[];
  activeCharIndex: number | null;
};

export function TextFollowAlong({
  tokens,
  activeCharIndex,
}: TextFollowAlongProps) {
  const t = useTranslations("FollowAlong");
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
      empty={t("textEmpty")}
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
              {token.letter.foldedChar}
            </span>
          );
        })}
      </p>
    </FollowAlongShell>
  );
}
