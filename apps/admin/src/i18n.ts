import i18next from "i18next";
import { createWebI18n } from "@wmshr/i18n/web";

const adminI18n = createWebI18n({ defaultNS: "admin", instance: i18next });

export default adminI18n;
