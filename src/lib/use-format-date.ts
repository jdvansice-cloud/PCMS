"use client";

import { useCallback } from "react";
import { useTenant } from "@/lib/tenant-context";
import { getLocaleTag } from "@/lib/locale-tag";

/**
 * Hook that returns date/time formatters using the org's timezone and locale.
 *
 * Usage:
 *   const { formatDate, formatTime, formatDateTime } = useFormatDate();
 *   <span>{formatDate(someDate)}</span>
 *   <span>{formatTime(someDate)}</span>
 */
export function useFormatDate() {
  const { organization } = useTenant();
  const tz = organization.timezone || "America/Panama";
  const locale = getLocaleTag(organization.locale || "es");

  /** Format date only (e.g. "23 mar 2026") */
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString(locale, {
        timeZone: tz,
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
      });
    },
    [tz, locale]
  );

  /** Format time only (e.g. "2:30 PM") */
  const formatTime = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleTimeString(locale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      });
    },
    [tz, locale]
  );

  /** Format date + time (e.g. "23 mar 2:30 PM") */
  const formatDateTime = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleString(locale, {
        timeZone: tz,
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      });
    },
    [tz, locale]
  );

  /** Format date long form (e.g. "Monday, March 23, 2026") */
  const formatDateLong = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString(locale, {
        timeZone: tz,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options,
      });
    },
    [tz, locale]
  );

  return { formatDate, formatTime, formatDateTime, formatDateLong, timezone: tz, locale };
}
