import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      Edit: 'Edit',
      Delete: 'Delete',
      Save: 'Save',
      Cancel: 'Cancel',
      'Add Event': 'Add Event',
      Events: 'Events',
      'Select an event to see the details':
        'Select an event to see the details',
      Today: 'Today',
      'Saving...': 'Saving...',
      'Deleting...': 'Deleting...',
      'Create New Event': 'Create New Event',
      Title: 'Title',
      Description: 'Description',
      Year: 'Year',
      Month: 'Month',
      Day: 'Day',
      Recurrence: 'Recurrence',
      Yearly: 'Yearly',
      Monthly: 'Monthly',
      Weekly: 'Weekly',
      'Creating...': 'Creating...',
      Close: 'Close',
      'Sign Out': 'Sign Out',
      'Loading your events...': 'Loading your events...',
      'Failed to load events. Please try refreshing the page.':
        'Failed to load events. Please try refreshing the page.',
      'Event created successfully!': 'Event created successfully!',
      'Failed to create event. Please try again.':
        'Failed to create event. Please try again.',
      'Event deleted successfully!': 'Event deleted successfully!',
      'Failed to delete event. Please try again.':
        'Failed to delete event. Please try again.',
      'Event saved successfully!': 'Event saved successfully!',
      'Failed to save event. Please try again.':
        'Failed to save event. Please try again.',
      more: 'more',
      Week: 'Week',
      Agenda: 'Agenda',
      Time: 'Time',
      'Event Details': 'Event Details',
      'User Profile': 'User Profile',
      Menu: 'Menu',
      Name: 'Name',
      Email: 'Email',
      'Account Provider': 'Account Provider',
      'Session Status': 'Session Status',
      Active: 'Active',
      'User Avatar': 'User Avatar',
      'Loading...': 'Loading...',
      // Language names
      English: 'English',
      Spanish: 'Spanish',
      Hebrew: 'Hebrew',
      Language: 'Language',
      // Calendar type names
      Gregorian: 'Gregorian',
      'Hebrew Calendar': 'Hebrew',
      'Calendar View': 'Calendar View',
      User: 'User',
      // Additional event list translations
      'No events for this date': 'No events for this date',
      'Select a date to view events': 'Select a date to view events',
      // Google Calendar sync translations
      'Google Calendar': 'Google Calendar',
      'Google Sync': 'Google Sync',
      'Sync with Google Calendar': 'Sync with Google Calendar',
      'Synced with Google Calendar': 'Synced with Google Calendar',
      'Not synced with Google Calendar': 'Not synced with Google Calendar',
      'Checking sync status...': 'Checking sync status...',
      'Start syncing with Google Calendar':
        'Start syncing with Google Calendar',
      'Syncing...': 'Syncing...',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Hebrew Calendar Events',
      'Your Events': 'Your Events',
    },
  },
  he: {
    translation: {
      Edit: 'ערוך',
      Delete: 'מחק',
      Save: 'שמור',
      Cancel: 'בטל',
      'Add Event': 'הוסף אירוע',
      Events: 'אירועים',
      'Select an event to see the details': 'בחר אירוע כדי לראות את הפרטים',
      Today: 'היום',
      'Saving...': 'שומר...',
      'Deleting...': 'מוחק...',
      'Create New Event': 'צור אירוע חדש',
      Title: 'כותרת',
      Description: 'תיאור',
      Year: 'שנה',
      Month: 'חודש',
      Day: 'יום',
      Recurrence: 'תדירות',
      Yearly: 'שנתי',
      Monthly: 'חודשי',
      Weekly: 'שבועי',
      'Creating...': 'יוצר...',
      Close: 'סגור',
      'Sign Out': 'התנתק',
      'Loading your events...': 'טוען את האירועים שלך...',
      'Failed to load events. Please try refreshing the page.':
        'נכשל בטעינת האירועים. אנא רענן את הדף.',
      'Event created successfully!': 'האירוע נוצר בהצלחה!',
      'Failed to create event. Please try again.':
        'נכשל ביצירת האירוע. אנא נסה שוב.',
      'Event deleted successfully!': 'האירוע נמחק בהצלחה!',
      'Failed to delete event. Please try again.':
        'נכשל במחיקת האירוע. אנא נסה שוב.',
      'Event saved successfully!': 'האירוע נשמר בהצלחה!',
      'Failed to save event. Please try again.':
        'נכשל בשמירת האירוע. אנא נסה שוב.',
      more: 'עוד',
      Week: 'שבוע',
      Agenda: 'סדר יום',
      Time: 'שעה',
      'Event Details': 'פרטי אירוע',
      'User Profile': 'פרופיל משתמש',
      Menu: 'תפריט',
      Name: 'שם',
      Email: 'אימייל',
      'Account Provider': 'ספק החשבון',
      'Session Status': 'סטטוס החיבור',
      Active: 'פעיל',
      'User Avatar': 'תמונת משתמש',
      'Loading...': 'טוען...',
      // Language names
      English: 'אנגלית',
      Spanish: 'ספרדית',
      Hebrew: 'עברית',
      Language: 'שפה',
      // Calendar type names
      Gregorian: 'לועזי',
      'Hebrew Calendar': 'עברי',
      'Calendar View': 'תצוגת לוח שנה',
      User: 'משתמש',
      // Additional event list translations
      'No events for this date': 'אין אירועים לתאריך זה',
      'Select a date to view events': 'בחר תאריך לצפייה באירועים',
      // Google Calendar sync translations
      'Google Calendar': 'יומן גוגל',
      'Google Sync': 'סנכרון גוגל',
      'Sync with Google Calendar': 'סנכרון עם יומן גוגל',
      'Synced with Google Calendar': 'מסונכרן עם יומן גוגל',
      'Not synced with Google Calendar': 'לא מסונכרן עם יומן גוגל',
      'Checking sync status...': 'בודק סטטוס סינכרון...',
      'Start syncing with Google Calendar': 'התחל סינכרון עם יומן גוגל',
      'Syncing...': 'מסנכרן...',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'אירועי לוח עברי',
      'Your Events': 'האירועים שלך',
    },
  },
  es: {
    translation: {
      Edit: 'Editar',
      Delete: 'Eliminar',
      Save: 'Guardar',
      Cancel: 'Cancelar',
      'Add Event': 'Agregar Evento',
      Events: 'Eventos',
      'Select an event to see the details':
        'Selecciona un evento para ver los detalles',
      Today: 'Hoy',
      'Saving...': 'Guardando...',
      'Deleting...': 'Eliminando...',
      'Create New Event': 'Crear Nuevo Evento',
      Title: 'Título',
      Description: 'Descripción',
      Year: 'Año',
      Month: 'Mes',
      Day: 'Día',
      Recurrence: 'Recurrencia',
      Yearly: 'Anual',
      Monthly: 'Mensual',
      Weekly: 'Semanal',
      'Creating...': 'Creando...',
      Close: 'Cerrar',
      'Sign Out': 'Cerrar Sesión',
      'Loading your events...': 'Cargando tus eventos...',
      'Failed to load events. Please try refreshing the page.':
        'Error al cargar eventos. Por favor recarga la página.',
      'Event created successfully!': '¡Evento creado exitosamente!',
      'Failed to create event. Please try again.':
        'Error al crear evento. Por favor intenta de nuevo.',
      'Event deleted successfully!': '¡Evento eliminado exitosamente!',
      'Failed to delete event. Please try again.':
        'Error al eliminar evento. Por favor intenta de nuevo.',
      'Event saved successfully!': '¡Evento guardado exitosamente!',
      'Failed to save event. Please try again.':
        'Error al guardar evento. Por favor intenta de nuevo.',
      more: 'más',
      Week: 'Semana',
      Agenda: 'Agenda',
      Time: 'Hora',
      'Event Details': 'Detalles del Evento',
      'User Profile': 'Perfil de Usuario',
      Menu: 'Menú',
      Name: 'Nombre',
      Email: 'Correo',
      'Account Provider': 'Proveedor de Cuenta',
      'Session Status': 'Estado de Sesión',
      Active: 'Activo',
      'User Avatar': 'Avatar de Usuario',
      'Loading...': 'Cargando...',
      // Language names
      English: 'Inglés',
      Spanish: 'Español',
      Hebrew: 'Hebreo',
      Language: 'Idioma',
      // Calendar type names
      Gregorian: 'Gregoriano',
      'Hebrew Calendar': 'Hebreo',
      'Calendar View': 'Vista de Calendario',
      User: 'Usuario',
      // Additional event list translations
      'No events for this date': 'No hay eventos para esta fecha',
      'Select a date to view events': 'Selecciona una fecha para ver eventos',
      // Google Calendar sync translations
      'Google Calendar': 'Google Calendar',
      'Google Sync': 'Sincronización Google',
      'Sync with Google Calendar': 'Sincronizar con Google Calendar',
      'Synced with Google Calendar': 'Sincronizado con Google Calendar',
      'Not synced with Google Calendar': 'No sincronizado con Google Calendar',
      'Checking sync status...': 'Verificando estado de sincronización...',
      'Start syncing with Google Calendar':
        'Comenzar sincronización con Google Calendar',
      'Syncing...': 'Sincronizando...',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Eventos del Calendario Hebreo',
      'Your Events': 'Tus Eventos',
    },
  },
};

// Get saved language from localStorage or default to 'en' (fallback only)
const getSavedLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('calbrew-language') || 'en';
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(), // Initial fallback, will be overridden by useLanguage hook
  interpolation: {
    escapeValue: false,
  },
});

// Keep localStorage as backup for language changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('calbrew-language', lng);
  }
});

// RTL languages configuration
export const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

// Helper function to get text direction
export const getTextDirection = (language: string): 'rtl' | 'ltr' => {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
};

export default i18n;
