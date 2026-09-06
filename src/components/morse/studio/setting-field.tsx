"use client";

import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SettingLabel({
  children,
  info,
  htmlFor,
}: {
  children: ReactNode;
  info: string;
  htmlFor?: string;
}) {
  const t = useTranslations("Settings");
  const aboutLabel =
    typeof children === "string"
      ? t("aboutSetting", { label: children })
      : t("aboutThisSetting");

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label={aboutLabel}
        >
          <InfoIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-pretty">
          {info}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SettingRow({
  label,
  info,
  valueLabel,
  children,
}: {
  label: string;
  info: string;
  valueLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <SettingLabel info={info}>{label}</SettingLabel>
        <Badge variant="secondary">{valueLabel}</Badge>
      </div>
      {children}
    </div>
  );
}
