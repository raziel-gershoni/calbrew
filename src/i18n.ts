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
      'Validation error': 'Validation error',
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
      Russian: 'Russian',
      German: 'German',
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
      Sync: 'Sync',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Hebrew Events',
      'Daily Learning Schedules': 'Daily Learning',
      'Your Events': 'Your Events',
      // Year Progression
      'Year Progression Status': 'Year Progression Status',
      'Checking year progression...': 'Checking year progression...',
      'Error checking year progression': 'Error checking year progression',
      'Try again': 'Try again',
      'Refresh status': 'Refresh status',
      'All events are up to date': 'All events are up to date',
      '{{count}} events need year progression updates':
        '{{count}} events need year progression updates',
      'No events found': 'No events found',
      '{{total}} total events, {{upToDate}} up to date':
        '{{total}} total events, {{upToDate}} up to date',
      'Sync All Events': 'Sync All Events',
      'Last checked: {{time}}': 'Last checked: {{time}}',
      'Sync Event Years': 'Sync Event Years',
      'Check for new years': 'Check for new years',
      'Event is up to date': 'Event is up to date',
      'New years available: {{years}}': 'New years available: {{years}}',
      'Sync new years': 'Sync new years',
      'Years synced successfully': 'Years synced successfully',
      'Failed to sync years': 'Failed to sync years',
      '{{count}} events updated with new years':
        '{{count}} events updated with new years',
      'No year progression updates needed':
        'No year progression updates needed',
      'Event years have been updated': 'Event years have been updated',
      // Jump to Date functionality
      'Jump to Date': 'Jump to Date',
      'Go to Date': 'Go to Date',
      'Edit Date': 'Edit Date',
      Confirm: 'Confirm',
      // Hebrew Event Types
      'Event Types': 'Event Types',
      'Learning Types': 'Learning Types',
      hebrew_events: {
        major_holidays: 'Major Holidays',
        minor_holidays: 'Minor Holidays',
        fast_days: 'Fast Days',
        rosh_chodesh: 'Rosh Chodesh',
        modern_holidays: 'Modern Israeli Holidays',
        torah_readings: 'Torah Readings',
        special_shabbat: 'Special Shabbat',
        omer_count: 'Omer Count',
      },
      daily_learning: {
        daf_yomi: 'Daf Yomi',
        mishna_yomi: 'Mishna Yomi',
        yerushalmi_yomi: 'Yerushalmi Yomi',
        nach_yomi: 'Nach Yomi',
      },
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
      'Validation error': 'שגיאת אימות',
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
      Russian: 'רוסית',
      German: 'גרמנית',
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
      Sync: 'סנכרן',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'אירועי עברי',
      'Daily Learning Schedules': 'לימוד יומי',
      'Your Events': 'האירועים שלך',
      // Year Progression
      'Year Progression Status': 'מצב התקדמות שנים',
      'Checking year progression...': 'בודק התקדמות שנים...',
      'Error checking year progression': 'שגיאה בבדיקת התקדמות שנים',
      'Try again': 'נסה שוב',
      'Refresh status': 'רענן מצב',
      'All events are up to date': 'כל האירועים מעודכנים',
      '{{count}} events need year progression updates':
        '{{count}} אירועים זקוקים לעדכון שנים',
      'No events found': 'לא נמצאו אירועים',
      '{{total}} total events, {{upToDate}} up to date':
        '{{total}} אירועים בסך הכל, {{upToDate}} מעודכנים',
      'Sync All Events': 'סנכרן את כל האירועים',
      'Last checked: {{time}}': 'נבדק לאחרונה: {{time}}',
      'Sync Event Years': 'סנכרן שנות אירוע',
      'Check for new years': 'בדוק שנים חדשות',
      'Event is up to date': 'האירוע מעודכן',
      'New years available: {{years}}': 'שנים חדשות זמינות: {{years}}',
      'Sync new years': 'סנכרן שנים חדשות',
      'Years synced successfully': 'השנים סונכרנו בהצלחה',
      'Failed to sync years': 'נכשל בסנכרון שנים',
      '{{count}} events updated with new years':
        '{{count}} אירועים עודכנו עם שנים חדשות',
      'No year progression updates needed': 'אין צורך בעדכוני התקדמות שנים',
      'Event years have been updated': 'שנות האירוע עודכנו',
      // Jump to Date functionality
      'Jump to Date': 'קפיצה לתאריך',
      'Go to Date': 'עבור לתאריך',
      'Edit Date': 'ערוך תאריך',
      Confirm: 'אשר',
      // Hebrew Event Types
      'Event Types': 'סוגי אירועים',
      'Learning Types': 'סוגי לימוד',
      hebrew_events: {
        major_holidays: 'חגים גדולים',
        minor_holidays: 'חגים קטנים',
        fast_days: 'ימי צום',
        rosh_chodesh: 'ראש חודש',
        modern_holidays: 'חגים מודרניים',
        torah_readings: 'קריאת התורה',
        special_shabbat: 'שבתות מיוחדות',
        omer_count: 'ספירת העומר',
      },
      daily_learning: {
        daf_yomi: 'דף יומי',
        mishna_yomi: 'משנה יומי',
        yerushalmi_yomi: 'ירושלמי יומי',
        nach_yomi: 'נ״ך יומי',
      },
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
      'Validation error': 'Error de validación',
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
      Russian: 'Ruso',
      German: 'Alemán',
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
      Sync: 'Sincronizar',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Eventos Hebreos',
      'Daily Learning Schedules': 'Aprendizaje Diario',
      'Your Events': 'Tus Eventos',
      // Year Progression
      'Year Progression Status': 'Estado de Progresión de Años',
      'Checking year progression...': 'Verificando progresión de años...',
      'Error checking year progression':
        'Error al verificar progresión de años',
      'Try again': 'Intentar de nuevo',
      'Refresh status': 'Actualizar estado',
      'All events are up to date': 'Todos los eventos están actualizados',
      '{{count}} events need year progression updates':
        '{{count}} eventos necesitan actualizaciones de años',
      'No events found': 'No se encontraron eventos',
      '{{total}} total events, {{upToDate}} up to date':
        '{{total}} eventos totales, {{upToDate}} actualizados',
      'Sync All Events': 'Sincronizar Todos los Eventos',
      'Last checked: {{time}}': 'Última verificación: {{time}}',
      'Sync Event Years': 'Sincronizar Años de Evento',
      'Check for new years': 'Verificar nuevos años',
      'Event is up to date': 'El evento está actualizado',
      'New years available: {{years}}': 'Nuevos años disponibles: {{years}}',
      'Sync new years': 'Sincronizar nuevos años',
      'Years synced successfully': 'Años sincronizados exitosamente',
      'Failed to sync years': 'Error al sincronizar años',
      '{{count}} events updated with new years':
        '{{count}} eventos actualizados con nuevos años',
      'No year progression updates needed':
        'No se necesitan actualizaciones de progresión de años',
      'Event years have been updated':
        'Los años del evento han sido actualizados',
      // Jump to Date functionality
      'Jump to Date': 'Saltar a Fecha',
      'Go to Date': 'Ir a Fecha',
      'Edit Date': 'Editar Fecha',
      Confirm: 'Confirmar',
      // Hebrew Event Types
      'Event Types': 'Tipos de Eventos',
      'Learning Types': 'Tipos de Aprendizaje',
      hebrew_events: {
        major_holidays: 'Festividades Mayores',
        minor_holidays: 'Festividades Menores',
        fast_days: 'Días de Ayuno',
        rosh_chodesh: 'Rosh Jódesh',
        modern_holidays: 'Festividades Modernas de Israel',
        torah_readings: 'Lecturas de la Torá',
        special_shabbat: 'Shabat Especiales',
        omer_count: 'Cuenta del Ómer',
      },
      daily_learning: {
        daf_yomi: 'Daf Yomi',
        mishna_yomi: 'Mishná Yomi',
        yerushalmi_yomi: 'Yerushalmi Yomi',
        nach_yomi: 'Nach Yomi',
      },
    },
  },
  ru: {
    translation: {
      Edit: 'Редактировать',
      Delete: 'Удалить',
      Save: 'Сохранить',
      Cancel: 'Отмена',
      'Add Event': 'Добавить событие',
      Events: 'События',
      'Select an event to see the details':
        'Выберите событие для просмотра деталей',
      Today: 'Сегодня',
      'Saving...': 'Сохранение...',
      'Deleting...': 'Удаление...',
      'Create New Event': 'Создать новое событие',
      Title: 'Название',
      Description: 'Описание',
      Year: 'Год',
      Month: 'Месяц',
      Day: 'День',
      Recurrence: 'Повторение',
      Yearly: 'Ежегодно',
      Monthly: 'Ежемесячно',
      Weekly: 'Еженедельно',
      'Creating...': 'Создание...',
      Close: 'Закрыть',
      'Sign Out': 'Выйти',
      'Loading your events...': 'Загрузка ваших событий...',
      'Failed to load events. Please try refreshing the page.':
        'Не удалось загрузить события. Пожалуйста, обновите страницу.',
      'Event created successfully!': 'Событие успешно создано!',
      'Failed to create event. Please try again.':
        'Не удалось создать событие. Пожалуйста, попробуйте еще раз.',
      'Event deleted successfully!': 'Событие успешно удалено!',
      'Failed to delete event. Please try again.':
        'Не удалось удалить событие. Пожалуйста, попробуйте еще раз.',
      'Event saved successfully!': 'Событие успешно сохранено!',
      'Failed to save event. Please try again.':
        'Не удалось сохранить событие. Пожалуйста, попробуйте еще раз.',
      'Validation error': 'Ошибка валидации',
      more: 'еще',
      Week: 'Неделя',
      Agenda: 'Повестка дня',
      Time: 'Время',
      'Event Details': 'Детали события',
      'User Profile': 'Профиль пользователя',
      Menu: 'Меню',
      Name: 'Имя',
      Email: 'Электронная почта',
      'Account Provider': 'Поставщик аккаунта',
      'Session Status': 'Статус сессии',
      Active: 'Активен',
      'User Avatar': 'Аватар пользователя',
      'Loading...': 'Загрузка...',
      // Language names
      English: 'Английский',
      Spanish: 'Испанский',
      Hebrew: 'Иврит',
      Russian: 'Русский',
      German: 'Немецкий',
      Language: 'Язык',
      // Calendar type names
      Gregorian: 'Грег.',
      'Hebrew Calendar': 'Евр.',
      'Calendar View': 'Вид календаря',
      User: 'Пользователь',
      // Additional event list translations
      'No events for this date': 'Нет событий на эту дату',
      'Select a date to view events': 'Выберите дату для просмотра событий',
      // Google Calendar sync translations
      'Google Calendar': 'Google Календарь',
      'Google Sync': 'Синхронизация Google',
      'Sync with Google Calendar': 'Синхронизировать с Google Календарем',
      'Synced with Google Calendar': 'Синхронизировано с Google Календарем',
      'Not synced with Google Calendar':
        'Не синхронизировано с Google Календарем',
      'Checking sync status...': 'Проверка статуса синхронизации...',
      'Start syncing with Google Calendar':
        'Начать синхронизацию с Google Календарем',
      'Syncing...': 'Синхронизация...',
      Sync: 'Синхронизировать',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Еврейские события',
      'Daily Learning Schedules': 'Ежедневное обучение',
      'Your Events': 'Ваши события',
      // Year Progression
      'Year Progression Status': 'Статус продвижения годов',
      'Checking year progression...': 'Проверка продвижения годов...',
      'Error checking year progression': 'Ошибка проверки продвижения годов',
      'Try again': 'Попробовать снова',
      'Refresh status': 'Обновить статус',
      'All events are up to date': 'Все события актуальны',
      '{{count}} events need year progression updates':
        '{{count}} событий требуют обновления годов',
      'No events found': 'События не найдены',
      '{{total}} total events, {{upToDate}} up to date':
        '{{total}} всего событий, {{upToDate}} актуальных',
      'Sync All Events': 'Синхронизировать все события',
      'Last checked: {{time}}': 'Последняя проверка: {{time}}',
      'Sync Event Years': 'Синхронизировать годы события',
      'Check for new years': 'Проверить новые годы',
      'Event is up to date': 'Событие актуально',
      'New years available: {{years}}': 'Доступны новые годы: {{years}}',
      'Sync new years': 'Синхронизировать новые годы',
      'Years synced successfully': 'Годы успешно синхронизированы',
      'Failed to sync years': 'Не удалось синхронизировать годы',
      '{{count}} events updated with new years':
        '{{count}} событий обновлено с новыми годами',
      'No year progression updates needed':
        'Обновления продвижения годов не требуются',
      'Event years have been updated': 'Годы события были обновлены',
      // Jump to Date functionality
      'Jump to Date': 'Перейти к дате',
      'Go to Date': 'Перейти к дате',
      'Edit Date': 'Редактировать дату',
      Confirm: 'Подтвердить',
      // Hebrew Event Types
      'Event Types': 'Типы событий',
      'Learning Types': 'Типы изучения',
      hebrew_events: {
        major_holidays: 'Большие праздники',
        minor_holidays: 'Малые праздники',
        fast_days: 'Дни поста',
        rosh_chodesh: 'Рош Ходеш',
        modern_holidays: 'Современные израильские праздники',
        torah_readings: 'Чтения Торы',
        special_shabbat: 'Особые субботы',
        omer_count: 'Счет Омера',
      },
      daily_learning: {
        daf_yomi: 'Даф Йоми',
        mishna_yomi: 'Мишна Йоми',
        yerushalmi_yomi: 'Иерусалимский Йоми',
        nach_yomi: 'Нах Йоми',
      },
    },
  },
  de: {
    translation: {
      Edit: 'Bearbeiten',
      Delete: 'Löschen',
      Save: 'Speichern',
      Cancel: 'Abbrechen',
      'Add Event': 'Ereignis hinzufügen',
      Events: 'Ereignisse',
      'Select an event to see the details':
        'Wählen Sie ein Ereignis aus, um die Details zu sehen',
      Today: 'Heute',
      'Saving...': 'Speichern...',
      'Deleting...': 'Löschen...',
      'Create New Event': 'Neues Ereignis erstellen',
      Title: 'Titel',
      Description: 'Beschreibung',
      Year: 'Jahr',
      Month: 'Monat',
      Day: 'Tag',
      Recurrence: 'Wiederholung',
      Yearly: 'Jährlich',
      Monthly: 'Monatlich',
      Weekly: 'Wöchentlich',
      'Creating...': 'Erstellen...',
      Close: 'Schließen',
      'Sign Out': 'Abmelden',
      'Loading your events...': 'Lade deine Ereignisse...',
      'Failed to load events. Please try refreshing the page.':
        'Fehler beim Laden der Ereignisse. Bitte aktualisiere die Seite.',
      'Event created successfully!': 'Ereignis erfolgreich erstellt!',
      'Failed to create event. Please try again.':
        'Fehler beim Erstellen des Ereignisses. Bitte versuche es erneut.',
      'Event deleted successfully!': 'Ereignis erfolgreich gelöscht!',
      'Failed to delete event. Please try again.':
        'Fehler beim Löschen des Ereignisses. Bitte versuche es erneut.',
      'Event saved successfully!': 'Ereignis erfolgreich gespeichert!',
      'Failed to save event. Please try again.':
        'Fehler beim Speichern des Ereignisses. Bitte versuche es erneut.',
      'Validation error': 'Validierungsfehler',
      more: 'mehr',
      Week: 'Woche',
      Agenda: 'Agenda',
      Time: 'Zeit',
      'Event Details': 'Ereignisdetails',
      'User Profile': 'Benutzerprofil',
      Menu: 'Menü',
      Name: 'Name',
      Email: 'E-Mail',
      'Account Provider': 'Account-Anbieter',
      'Session Status': 'Sitzungsstatus',
      Active: 'Aktiv',
      'User Avatar': 'Benutzeravatar',
      'Loading...': 'Laden...',
      // Language names
      English: 'Englisch',
      Spanish: 'Spanisch',
      Hebrew: 'Hebräisch',
      Russian: 'Russisch',
      German: 'Deutsch',
      Language: 'Sprache',
      // Calendar type names
      Gregorian: 'Greg.',
      'Hebrew Calendar': 'Hebräisch',
      'Calendar View': 'Kalenderansicht',
      User: 'Benutzer',
      // Additional event list translations
      'No events for this date': 'Keine Ereignisse für dieses Datum',
      'Select a date to view events':
        'Wählen Sie ein Datum aus, um Ereignisse zu sehen',
      // Google Calendar sync translations
      'Google Calendar': 'Google Kalender',
      'Google Sync': 'Google Synchronisation',
      'Sync with Google Calendar': 'Mit Google Kalender synchronisieren',
      'Synced with Google Calendar': 'Mit Google Kalender synchronisiert',
      'Not synced with Google Calendar':
        'Nicht mit Google Kalender synchronisiert',
      'Checking sync status...': 'Überprüfe Synchronisationsstatus...',
      'Start syncing with Google Calendar':
        'Beginne Synchronisation mit Google Kalender',
      'Syncing...': 'Synchronisierung...',
      Sync: 'Synchronisieren',
      // Hebrew Calendar Events
      'Hebrew Calendar Events': 'Hebräische Ereignisse',
      'Daily Learning Schedules': 'Tägliches Lernen',
      'Your Events': 'Deine Ereignisse',
      // Year Progression
      'Year Progression Status': 'Jahresfortschrittsstatus',
      'Checking year progression...': 'Jahresfortschritt wird überprüft...',
      'Error checking year progression':
        'Fehler beim Überprüfen des Jahresfortschritts',
      'Try again': 'Erneut versuchen',
      'Refresh status': 'Status aktualisieren',
      'All events are up to date':
        'Alle Ereignisse sind auf dem neuesten Stand',
      '{{count}} events need year progression updates':
        '{{count}} Ereignisse benötigen Jahresaktualisierungen',
      'No events found': 'Keine Ereignisse gefunden',
      '{{total}} total events, {{upToDate}} up to date':
        '{{total}} Ereignisse insgesamt, {{upToDate}} aktuell',
      'Sync All Events': 'Alle Ereignisse synchronisieren',
      'Last checked: {{time}}': 'Zuletzt überprüft: {{time}}',
      'Sync Event Years': 'Ereignisjahre synchronisieren',
      'Check for new years': 'Nach neuen Jahren suchen',
      'Event is up to date': 'Ereignis ist aktuell',
      'New years available: {{years}}': 'Neue Jahre verfügbar: {{years}}',
      'Sync new years': 'Neue Jahre synchronisieren',
      'Years synced successfully': 'Jahre erfolgreich synchronisiert',
      'Failed to sync years': 'Synchronisierung der Jahre fehlgeschlagen',
      '{{count}} events updated with new years':
        '{{count}} Ereignisse mit neuen Jahren aktualisiert',
      'No year progression updates needed':
        'Keine Jahresfortschritt-Updates erforderlich',
      'Event years have been updated': 'Ereignisjahre wurden aktualisiert',
      // Jump to Date functionality
      'Jump to Date': 'Zu Datum springen',
      'Go to Date': 'Zu Datum gehen',
      'Edit Date': 'Datum bearbeiten',
      Confirm: 'Bestätigen',
      // Hebrew Event Types
      'Event Types': 'Ereignistypen',
      'Learning Types': 'Lerntypen',
      hebrew_events: {
        major_holidays: 'Große Feiertage',
        minor_holidays: 'Kleine Feiertage',
        fast_days: 'Fasttage',
        rosh_chodesh: 'Rosch Chodesch',
        modern_holidays: 'Moderne israelische Feiertage',
        torah_readings: 'Torah-Lesungen',
        special_shabbat: 'Besondere Schabbat',
        omer_count: 'Omer-Zählung',
      },
      daily_learning: {
        daf_yomi: 'Daf Yomi',
        mishna_yomi: 'Mischna Yomi',
        yerushalmi_yomi: 'Jerusalemer Yomi',
        nach_yomi: 'Nach Yomi',
      },
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
