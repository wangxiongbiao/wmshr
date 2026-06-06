import i18next from "i18next";

/**
 * Deep admin modules still keep table, modal, and callback copy outside React Hook scope.
 * Read the already-initialized i18next singleton here so future migrations do not reintroduce scattered literals.
 * Dynamic copy must use i18next interpolation keys such as {{count}} instead of template literals, otherwise every runtime value becomes a missing translation key.
 * Admin text keys are Chinese literals and may legally contain ':' for labels such as payslip fields; keep nsSeparator disabled here because this helper already pins ns="admin".
 * Convert a call site to useTranslation only after confirming it always runs inside a React render path.
 */
export function tAdmin(key: string, options?: Record<string, unknown>) {
  // Force the admin namespace and disable ':' namespace parsing so label keys like "本月有效上班天数:" resolve from admin resources instead of falling back to their Chinese defaultValue.
  return i18next.t(key, { ...options, ns: "admin", nsSeparator: false });
}
