/** Maps org locale code to BCP-47 locale tag for Intl APIs. */
const LOCALE_MAP: Record<string, string> = {
  es: "es-PA",
  en: "en-US",
};

export function getLocaleTag(orgLocale: string): string {
  return LOCALE_MAP[orgLocale] || orgLocale;
}
