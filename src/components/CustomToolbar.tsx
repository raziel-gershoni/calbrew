
import { HDate, gematriya, Locale } from '@hebcal/core';
import moment from 'moment';
import { ToolbarProps } from 'react-big-calendar';
import { Event } from '@/types/event';

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

export default function CustomToolbar({ date, onNavigate }: ToolbarProps<CalendarDisplayEvent>) {
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

  let title = '';
  if (startYear === endYear) {
    if (startMonthNameHe === endMonthNameHe) {
      title = `${startMonthNameHe}, ${gematriya(startYear)}`;
    } else {
      title = `${startMonthNameHe} / ${endMonthNameHe}, ${gematriya(startYear)}`;
    }
  } else {
    title = `${startMonthNameHe}, ${gematriya(startYear)} / ${endMonthNameHe}, ${gematriya(endYear)}`;
  }

  return (
    <div className='rbc-toolbar'>
      <span className='rbc-btn-group'>
        <button type='button' onClick={() => onNavigate('PREV')}>
          &#x2192;
        </button>
        <button type='button' onClick={() => onNavigate('TODAY')}>
          Today
        </button>
        <button type='button' onClick={() => onNavigate('NEXT')}>
          &#x2190;
        </button>
      </span>
      <span className='rbc-toolbar-label'>{title}</span>
      <span className='rbc-btn-group'></span>
    </div>
  );
}
