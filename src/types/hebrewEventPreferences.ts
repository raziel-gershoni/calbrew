/**
 * Hebrew Calendar Events Preferences Interface
 * Maps to the hebrew_calendar_preferences JSONB column in the users table
 */
export interface HebrewCalendarPreferences {
  majorHolidays: boolean; // CHAG - Rosh Hashana, Yom Kippur, Pesach, Sukkot, etc.
  minorHolidays: boolean; // MINOR_HOLIDAY - Tu BiShvat, Lag BaOmer, Tu B'Av
  fastDays: boolean; // MAJOR_FAST + MINOR_FAST - Yom Kippur, Tish'a B'Av, Ta'anit Esther, etc.
  roshChodesh: boolean; // ROSH_CHODESH - Beginning of new Hebrew month
  modernHolidays: boolean; // MODERN_HOLIDAY - Israeli holidays (Yom HaShoah, Yom HaAtzma'ut)
  torahReadings: boolean; // PARSHA_HASHAVUA - Weekly Torah portions
  specialShabbat: boolean; // SPECIAL_SHABBAT - Shabbat Shekalim, Zachor, etc.
  omerCount: boolean; // OMER_COUNT - Days of counting the Omer
}

/**
 * Daily Learning Preferences Interface
 * Maps to the daily_learning_preferences JSONB column in the users table
 */
export interface DailyLearningPreferences {
  dafYomi: boolean; // DAF_YOMI - Daily Talmud page (Bavli)
  mishnaYomi: boolean; // MISHNA_YOMI - Daily Mishna
  yerushalmiYomi: boolean; // YERUSHALMI_YOMI - Daily Jerusalem Talmud page
  nachYomi: boolean; // NACH_YOMI - Daily Nach (Prophets/Writings)
}

/**
 * Combined Hebrew Event Preferences (for backward compatibility)
 */
export interface HebrewEventPreferences
  extends HebrewCalendarPreferences,
    DailyLearningPreferences {}

/**
 * Default Hebrew calendar preferences
 * Conservative selection showing most common observances
 */
export const DEFAULT_HEBREW_CALENDAR_PREFERENCES: HebrewCalendarPreferences = {
  majorHolidays: true,
  minorHolidays: true,
  fastDays: true,
  roshChodesh: true,
  modernHolidays: false,
  torahReadings: false,
  specialShabbat: false,
  omerCount: false,
};

/**
 * Default daily learning preferences
 * All disabled by default as these are specialized study schedules
 */
export const DEFAULT_DAILY_LEARNING_PREFERENCES: DailyLearningPreferences = {
  dafYomi: false,
  mishnaYomi: false,
  yerushalmiYomi: false,
  nachYomi: false,
};

/**
 * Default Hebrew event preferences (for backward compatibility)
 */
export const DEFAULT_HEBREW_EVENT_PREFERENCES: HebrewEventPreferences = {
  ...DEFAULT_HEBREW_CALENDAR_PREFERENCES,
  ...DEFAULT_DAILY_LEARNING_PREFERENCES,
};

/**
 * Hebrew calendar event type translation keys for i18n
 */
export const HEBREW_CALENDAR_EVENT_TYPE_KEYS = {
  majorHolidays: 'hebrew_events.major_holidays',
  minorHolidays: 'hebrew_events.minor_holidays',
  fastDays: 'hebrew_events.fast_days',
  roshChodesh: 'hebrew_events.rosh_chodesh',
  modernHolidays: 'hebrew_events.modern_holidays',
  torahReadings: 'hebrew_events.torah_readings',
  specialShabbat: 'hebrew_events.special_shabbat',
  omerCount: 'hebrew_events.omer_count',
} as const;

/**
 * Daily learning type translation keys for i18n
 */
export const DAILY_LEARNING_TYPE_KEYS = {
  dafYomi: 'daily_learning.daf_yomi',
  mishnaYomi: 'daily_learning.mishna_yomi',
  yerushalmiYomi: 'daily_learning.yerushalmi_yomi',
  nachYomi: 'daily_learning.nach_yomi',
} as const;

/**
 * Combined Hebrew event type translation keys (for backward compatibility)
 */
export const HEBREW_EVENT_TYPE_KEYS = {
  ...HEBREW_CALENDAR_EVENT_TYPE_KEYS,
  ...DAILY_LEARNING_TYPE_KEYS,
} as const;
