import i18next from "i18next";
import * as SecureStore from "expo-secure-store";
import { createMobileI18n, MOBILE_LANGUAGE_STORAGE_KEY } from "@wmshr/i18n/mobile";

export const mobileI18nReady = createMobileI18n({
  defaultNS: "app",
  instance: i18next,
  loadPersistedLanguage: () => SecureStore.getItemAsync(MOBILE_LANGUAGE_STORAGE_KEY),
  persistLanguage: (language) => SecureStore.setItemAsync(MOBILE_LANGUAGE_STORAGE_KEY, language),
});

export default mobileI18nReady;
