import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["en", "hi", "mr", "ta", "bn"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANGUAGE_STORAGE_KEY = "sociosquad-lang";

export function normalizeSupportedLang(code: string): SupportedLang {
  const base = code.split("-")[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as SupportedLang) : "en";
}

// Only English (fallback) is bundled eagerly; other locales load on demand.
const localeLoaders: Record<Exclude<SupportedLang, "en">, () => Promise<{ default: object }>> = {
  hi: () => import("./locales/hi.json"),
  mr: () => import("./locales/mr.json"),
  ta: () => import("./locales/ta.json"),
  bn: () => import("./locales/bn.json"),
};

async function ensureLocale(code: string | undefined): Promise<void> {
  if (!code) return;
  const lang = normalizeSupportedLang(code);
  if (lang === "en" || i18n.hasResourceBundle(lang, "translation")) return;
  try {
    const mod = await localeLoaders[lang]();
    i18n.addResourceBundle(lang, "translation", mod.default, true, true);
  } catch (err) {
    console.error(`Failed to load locale "${lang}"`, err);
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGS],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

// Keep `i18n.changeLanguage('hi')` working: load the bundle first, then switch.
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng?: string, ...rest: []) => {
  await ensureLocale(lng);
  return originalChangeLanguage(lng, ...rest);
};

// Load the detected language (if not English) and re-apply it.
void ensureLocale(i18n.language).then(() => {
  if (i18n.language && normalizeSupportedLang(i18n.language) !== "en") {
    void originalChangeLanguage(i18n.language);
  }
});

export default i18n;
