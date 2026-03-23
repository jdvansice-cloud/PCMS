/**
 * Date/time formatting utilities that respect org timezone and locale.
 *
 * Usage in client components:
 *   const { formatDate, formatTime, formatDateTime } = useFormatDate();
 *
 * Usage in server components:
 *   import { getOrgDateSettings, formatDateServer } from "@/lib/format-date";
 *   const { timezone, locale } = await getOrgDateSettings();
 *   formatDateServer(date, timezone, locale);
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleTag } from "@/lib/locale-tag";

export { getLocaleTag };

/** Cached helper for server components — returns the org's timezone and locale. */
export const getOrgDateSettings = cache(async () => {
  const { organizationId } = await getCurrentUser();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true, locale: true },
  });
  return {
    timezone: org?.timezone ?? "America/Panama",
    locale: org?.locale ?? "es",
  };
});

// ---------------------------------------------------------------------------
// Server-side formatting helpers (no hooks needed)
// ---------------------------------------------------------------------------

/** Format a date for display (e.g. "23 mar 2026") */
export function formatDateServer(
  date: Date | string,
  timezone: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(getLocaleTag(locale), {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

/** Format a time for display (e.g. "2:30 PM") */
export function formatTimeServer(
  date: Date | string,
  timezone: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(getLocaleTag(locale), {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/** Format a date and time (e.g. "23 mar 2:30 PM") */
export function formatDateTimeServer(
  date: Date | string,
  timezone: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(getLocaleTag(locale), {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}
