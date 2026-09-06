"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Keep `<html lang>` in sync when locale changes without remounting the document. */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
