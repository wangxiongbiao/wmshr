import { normalizeLanguage, type SupportedLanguageCode } from "@wmshr/i18n";

export const DEFAULT_HOME_LANGUAGE: SupportedLanguageCode = "en";

export type HomePageRoute = "home" | "privacy" | "terms" | "compliance";

export function buildHomeRoute(language: SupportedLanguageCode, page: HomePageRoute = "home") {
  if (page === "home") {
    return `/${language}`;
  }

  return `/${language}/${page}`;
}

export function parseHomeRoute(pathname: string) {
  const [rawLanguage, rawPage] = pathname.replace(/^\/+|\/+$/g, "").split("/");
  const language = normalizeLanguage(rawLanguage || DEFAULT_HOME_LANGUAGE);
  const isLegacyDownloadPath = rawPage === "download";
  const page: HomePageRoute =
    rawPage === "privacy" || rawPage === "terms" || rawPage === "compliance"
      ? rawPage
      : "home";
  const expectedRawPage = page === "home" ? undefined : page;
  const isKnownPage = !rawPage || rawPage === "privacy" || rawPage === "terms" || rawPage === "compliance" || rawPage === "download";
  const isCanonical = rawLanguage === language && isKnownPage && !isLegacyDownloadPath && rawPage === expectedRawPage;

  return {
    language,
    page,
    isLegacyDownloadPath,
    isCanonical,
    canonicalPath: buildHomeRoute(language, page),
  };
}
