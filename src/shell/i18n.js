import i18next from 'i18next';
import en from '../locales/en/translation.json';
import de from '../locales/de/translation.json';
import fr from '../locales/fr/translation.json';
import es from '../locales/es/translation.json';

const STORAGE_KEY = 'canvallax_lang';
const DEFAULT_LANGUAGE = 'en'; // ADR-0026: predictable default, not OS/browser-inferred (same reasoning as ADR-0020 for theme)

// Endonym + flag per language — never run through t(), same as the sibling
// project (Climb-Buddy-Belay) this is modeled on: a language's own name and
// its flag are fixed labels, not translatable content. Flags are plain
// Unicode emoji, no image/SVG assets, matching that same precedent.
const LANGUAGE_META = {
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
};
const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_META);

function readStoredLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
  } catch (e) {
    return DEFAULT_LANGUAGE; // private browsing / storage disabled
  }
}

// Resources are statically imported (ADR-0026), not fetched at runtime via
// i18next-http-backend like the sibling projects' CDN setup — Vite already
// bundles them, so init() below resolves with no network round-trip and no
// flash of untranslated content. Called and awaited before Alpine.start()
// (main.js), so translations are ready before the x-cloak'd shell ever
// un-hides.
export async function initI18n(Alpine) {
  const language = readStoredLanguage();
  await i18next.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
    },
    interpolation: { escapeValue: false },
  });
  document.documentElement.setAttribute('lang', language);

  Alpine.store('i18n', {
    language,
    supported: SUPPORTED_LANGUAGES,
    languages: LANGUAGE_META,

    // Reads `this.language` even though i18next.t() doesn't need it, purely
    // so Alpine's reactivity system registers a dependency on it — every
    // x-text bound through this re-evaluates when changeLanguage() below
    // updates it, the same way any other reactive Alpine property works.
    t(key, options) {
      void this.language;
      return i18next.t(key, options);
    },

    async changeLanguage(lang) {
      if (!SUPPORTED_LANGUAGES.includes(lang) || lang === this.language) return;
      await i18next.changeLanguage(lang);
      this.language = lang;
      document.documentElement.setAttribute('lang', lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        // private browsing / storage disabled — language just won't persist
      }
    },
  });
}
