"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const t = useTranslations("Theme");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background/60",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onThemeChange={setTheme}
      variant="circle"
      duration={450}
      srOnlyLabel={t("toggle")}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background/70 text-foreground shadow-xs backdrop-blur-sm transition-colors hover:bg-muted",
        "[&_svg]:size-4",
        className
      )}
    />
  );
}
