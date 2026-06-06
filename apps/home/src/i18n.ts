import i18next from "i18next";
import { createWebI18n } from "@wmshr/i18n/web";

const homeI18n = createWebI18n({ defaultNS: "portal", instance: i18next });

export default homeI18n;
