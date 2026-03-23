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
// Timezone-aware date creation (for user-entered date+time inputs)
// ---------------------------------------------------------------------------

/**
 * Convert a date + time entered by the user (in the org timezone) to a UTC Date.
 *
 * On Vercel servers, `new Date("2026-03-24T09:00:00")` is parsed as UTC,
 * but the user meant 9:00 AM in their org timezone. This helper corrects that.
 *
 * @param dateStr - "2026-03-24"
 * @param timeStr - "09:00" (or "09:00:00")
 * @param timezone - IANA timezone (e.g. "America/Panama")
 * @returns Date object representing the correct UTC instant
 */
export function localDateTimeToUTC(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  // Parse as if UTC to get a reference point
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const utcGuess = new Date(`${dateStr}T${normalized}Z`);

  // Find what local time that UTC instant maps to in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcGuess);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  // Build a Date from the local representation (treating it as UTC for comparison)
  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  );

  // The offset = localAsUtc - utcGuess  (positive means timezone is ahead of UTC)
  const offsetMs = localAsUtc - utcGuess.getTime();

  // Subtract offset: if Panama is UTC-5, offset is negative, so subtracting adds 5h
  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Convert a datetime-local input value to a UTC Date.
 * @param datetimeLocal - "2026-03-24T09:00" (from <input type="datetime-local">)
 * @param timezone - IANA timezone
 */
export function datetimeLocalToUTC(datetimeLocal: string, timezone: string): Date {
  const [datePart, timePart] = datetimeLocal.split("T");
  return localDateTimeToUTC(datePart, timePart, timezone);
}

/**
 * Get UTC day boundaries for a given date string in a specific timezone.
 * "2026-03-24" in "America/Panama" (UTC-5) becomes:
 *   dayStart = 2026-03-24T05:00:00Z  (midnight Panama = 5am UTC)
 *   dayEnd   = 2026-03-25T04:59:59Z  (11:59pm Panama = next day 4:59am UTC)
 */
export function getDayBoundsUTC(dateStr: string, timezone: string) {
  const dayStart = localDateTimeToUTC(dateStr, "00:00:00", timezone);
  const dayEnd = localDateTimeToUTC(dateStr, "23:59:59", timezone);
  return { dayStart, dayEnd };
}

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
