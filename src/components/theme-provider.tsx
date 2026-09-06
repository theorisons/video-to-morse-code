"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      // Avoid React 19 console noise from next-themes' inline anti-FOUC script.
      scriptProps={{ suppressHydrationWarning: true }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
