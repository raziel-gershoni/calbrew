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
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
