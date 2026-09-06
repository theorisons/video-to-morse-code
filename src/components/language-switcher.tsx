"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations("Language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: (typeof routing.locales)[number]) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex h-9 items-center gap-0.5 rounded-full border border-border bg-background/70 p-0.5 shadow-xs backdrop-blur-sm",
        isPending && "opacity-70",
        className
      )}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <Button
            key={code}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            aria-pressed={active}
            disabled={isPending}
            onClick={() => switchLocale(code)}
            className={cn(
              "h-8 min-w-8 rounded-full px-2.5 text-xs font-semibold tracking-wide",
              !active && "text-muted-foreground"
            )}
          >
            {t(code)}
          </Button>
        );
      })}
    </div>
  );
}
