import { HDate, gematriya, Locale } from '@hebcal/core';
import moment from 'moment';
import { ToolbarProps } from 'react-big-calendar';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

export default function CustomToolbar({ date, onNavigate }: ToolbarProps<CalendarDisplayEvent>) {
  const { t, i18n } = useTranslation();

  moment.locale(i18n.language);

  const startDate = moment(date).startOf('month');
  const endDate = moment(date).endOf('month');

  const startHDate = new HDate(startDate.toDate());
  const endHDate = new HDate(endDate.toDate());

  const startMonthNameEn = startHDate.getMonthName();
  const endMonthNameEn = endHDate.getMonthName();

  const startMonthNameHe = Locale.gettext(startMonthNameEn, 'he');
  const endMonthNameHe = Locale.gettext(endMonthNameEn, 'he');

  const startYear = startHDate.getFullYear();
  const endYear = endHDate.getFullYear();

  let hebrewDateStr = '';
  if (i18n.language === 'he') {
    if (startYear === endYear) {
      if (startMonthNameHe === endMonthNameHe) {
        hebrewDateStr = `${startMonthNameHe}, ${gematriya(startYear)}`;
      } else {
        hebrewDateStr = `${startMonthNameHe} / ${endMonthNameHe}, ${gematriya(startYear)}`;
      }
    } else {
      hebrewDateStr = `${startMonthNameHe}, ${gematriya(startYear)} / ${endMonthNameHe}, ${gematriya(endYear)}`;
    }
  } else {
    if (startYear === endYear) {
      if (startMonthNameEn === endMonthNameEn) {
        hebrewDateStr = `${startMonthNameEn}, ${startYear}`;
      } else {
        hebrewDateStr = `${startMonthNameEn} / ${endMonthNameEn}, ${startYear}`;
      }
    } else {
      hebrewDateStr = `${startMonthNameEn}, ${startYear} / ${endMonthNameEn}, ${endYear}`;
    }
  }

  const gregorianDateStr = moment(date).format('MMMM YYYY');

  const title = i18n.language === 'he' ? `${hebrewDateStr} (${gregorianDateStr})` : `${gregorianDateStr} (${hebrewDateStr})`;

  return (
    <div className='rbc-toolbar'>
      <span className='rbc-btn-group'>
        <button type='button' onClick={() => onNavigate('PREV')}>
          {i18n.language === 'he' ? '→' : '←'}
        </button>
        <button type='button' onClick={() => onNavigate('TODAY')}>
          {t('Today')}
        </button>
        <button type='button' onClick={() => onNavigate('NEXT')}>
          {i18n.language === 'he' ? '←' : '→'}
        </button>
      </span>
      <span className='rbc-toolbar-label'>{title}</span>
      <span className='rbc-btn-group'></span>
    </div>
  );
}