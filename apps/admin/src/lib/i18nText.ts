import i18next from "i18next";

/**
 * Deep admin modules still keep table, modal, and callback copy outside React Hook scope.
 * Read the already-initialized i18next singleton here so future migrations do not reintroduce scattered literals.
 * Dynamic copy must use i18next interpolation keys such as {{count}} instead of template literals, otherwise every runtime value becomes a missing translation key.
 * Convert a call site to useTranslation only after confirming it always runs inside a React render path.
 */
export function tAdmin(key: string, options?: Record<string, unknown>) {
  return i18next.t(key, { ns: "admin", ...options });
}
