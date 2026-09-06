import type { ReactNode } from "react";

type FollowAlongShellProps = {
  children: ReactNode;
  empty: string;
  isEmpty: boolean;
};

export function FollowAlongShell({
  children,
  empty,
  isEmpty,
}: FollowAlongShellProps) {
  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
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
