/**
 * Hebrew month name localization utility
 * Provides translations for Hebrew month names in multiple languages
 */

// Hebrew month names in different languages
const HEBREW_MONTH_TRANSLATIONS = {
  en: {
    Nisan: 'Nisan',
    Iyyar: 'Iyyar',
    Sivan: 'Sivan',
    Tamuz: 'Tamuz',
    Av: 'Av',
    Elul: 'Elul',
    Tishrei: 'Tishrei',
    Cheshvan: 'Cheshvan',
    Kislev: 'Kislev',
    Tevet: 'Tevet',
    Shvat: 'Shvat',
    Adar: 'Adar',
    'Adar I': 'Adar I',
    'Adar II': 'Adar II',
  },
  es: {
    Nisan: 'Nisán',
    Iyyar: 'Iyar',
    Sivan: 'Siván',
    Tamuz: 'Tamuz',
    Av: 'Av',
    Elul: 'Elul',
    Tishrei: 'Tishrei',
    Cheshvan: 'Jeshván',
    Kislev: 'Kislev',
    Tevet: 'Tevet',
    Shvat: 'Shvat',
    Adar: 'Adar',
    'Adar I': 'Adar I',
    'Adar II': 'Adar II',
  },
  ru: {
    Nisan: 'Нисан',
    Iyyar: 'Ияр',
    Sivan: 'Сиван',
    Tamuz: 'Таммуз',
    Av: 'Ав',
    Elul: 'Элул',
    Tishrei: 'Тишрей',
    Cheshvan: 'Хешван',
    Kislev: 'Кислев',
    Tevet: 'Тевет',
    Shvat: 'Шват',
    Adar: 'Адар',
    'Adar I': 'Адар I',
    'Adar II': 'Адар II',
  },
};

/**
 * Get localized Hebrew month name
 * @param monthName - Hebrew month name in English
 * @param locale - Language code (en, es, ru, he)
 * @returns Localized month name
 */
export function getLocalizedHebrewMonthName(
  monthName: string,
  locale: string,
): string {
  // For Hebrew, Spanish, and Russian, try to use Hebcal's Locale.gettext from @hebcal/hdate
  if (['he', 'es', 'ru'].includes(locale)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Locale } = require('@hebcal/hdate');
      const translation = Locale.gettext(monthName, locale);
      if (translation && translation !== monthName) {
        return translation;
      }
    } catch {
      // Fall through to custom translations
    }
  }

  // For other languages or if Hebcal translation fails, use our custom translations
  const translations =
    HEBREW_MONTH_TRANSLATIONS[locale as keyof typeof HEBREW_MONTH_TRANSLATIONS];
  return translations?.[monthName as keyof typeof translations] || monthName;
}

/**
 * Initialize Hebcal locales for holiday translations
 * Import the locales package to register translations
 */
let localesInitialized = false;

export async function initializeHebcalLocales(): Promise<void> {
  if (localesInitialized) {
    return;
  }

  try {
    // Dynamic import of @hebcal/locales ES module
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - @hebcal/locales doesn't have TypeScript declarations
    await import('@hebcal/locales');
    localesInitialized = true;
    console.log('Hebcal locales initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize @hebcal/locales:', error);
  }
}

/**
 * Get the correct Locale instance with all translations loaded
 * This returns @hebcal/hdate Locale which has the locales, not @hebcal/core
 */
export function getHebcalLocale() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Locale } = require('@hebcal/hdate');
    return Locale;
  } catch {
    // Fallback to @hebcal/core if @hebcal/hdate is not available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Locale } = require('@hebcal/core');
    return Locale;
  }
}

/**
 * Get localized holiday/event name using the correct Locale
 */
export function getLocalizedHolidayName(
  eventName: string,
  locale: string,
): string {
  try {
    const Locale = getHebcalLocale();
    const translation = Locale.gettext(eventName, locale);
    return translation || eventName;
  } catch {
    return eventName;
  }
}

/**
 * Get all available month name locales
 */
export function getAvailableMonthLocales(): string[] {
  return ['en', 'es', 'ru', 'he'];
}

/**
 * Check if a locale is supported for month names
 */
export function isMonthLocaleSupported(locale: string): boolean {
  return getAvailableMonthLocales().includes(locale);
}
