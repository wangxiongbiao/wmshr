import i18next from "i18next";
import { createMobileI18n, MOBILE_LANGUAGE_STORAGE_KEY } from "@wmshr/i18n/mobile";
import {getPersistentItem, setPersistentItem} from "../shared/utils/persistentStorage";

export const mobileI18nReady = createMobileI18n({
  defaultNS: "app",
  instance: i18next,
  loadPersistedLanguage: () => getPersistentItem(MOBILE_LANGUAGE_STORAGE_KEY),
  persistLanguage: (language) => setPersistentItem(MOBILE_LANGUAGE_STORAGE_KEY, language),
});

export default mobileI18nReady;
