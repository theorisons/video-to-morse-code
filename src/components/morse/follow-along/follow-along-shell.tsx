import type { ReactNode } from "react";

type FollowAlongShellProps = {
  children: ReactNode;
};

export function FollowAlongShell({ children }: FollowAlongShellProps) {
  return (
    <div
      className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-base leading-relaxed break-all"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
