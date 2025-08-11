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
      // Calendar month names
      January: 'January',
      February: 'February',
      March: 'March',
      April: 'April',
      May: 'May',
      June: 'June',
      July: 'July',
      August: 'August',
      September: 'September',
      October: 'October',
      November: 'November',
      December: 'December',
      // Language names
      English: 'English',
      Spanish: 'Spanish',
      Hebrew: 'Hebrew',
      Language: 'Language',
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
      // Calendar month names
      January: 'ינואר',
      February: 'פברואר',
      March: 'מרץ',
      April: 'אפריל',
      May: 'מאי',
      June: 'יוני',
      July: 'יולי',
      August: 'אוגוסט',
      September: 'ספטמבר',
      October: 'אוקטובר',
      November: 'נובמבר',
      December: 'דצמבר',
      // Language names
      English: 'אנגלית',
      Spanish: 'ספרדית',
      Hebrew: 'עברית',
      Language: 'שפה',
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
      // Calendar month names
      January: 'Enero',
      February: 'Febrero',
      March: 'Marzo',
      April: 'Abril',
      May: 'Mayo',
      June: 'Junio',
      July: 'Julio',
      August: 'Agosto',
      September: 'Septiembre',
      October: 'Octubre',
      November: 'Noviembre',
      December: 'Diciembre',
      // Language names
      English: 'Inglés',
      Spanish: 'Español',
      Hebrew: 'Hebreo',
      Language: 'Idioma',
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

export default i18n;
