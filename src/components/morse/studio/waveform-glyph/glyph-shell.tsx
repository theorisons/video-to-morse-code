import type { ReactNode } from "react";

type GlyphShellProps = {
  children: ReactNode;
};

export function GlyphShell({ children }: GlyphShellProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
