import { HDate, gematriya, Locale } from '@hebcal/core';
import moment from 'moment';
import { ToolbarProps } from 'react-big-calendar';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';

interface CalendarDisplayEvent extends Event {
  start: Date;
  end: Date;
}

interface CustomToolbarProps extends ToolbarProps<CalendarDisplayEvent> {
  isLandscapePhone?: boolean;
  isSmallScreen?: boolean;
  calendarHeight?: number;
}

export default function CustomToolbar({
  date,
  onNavigate,
  isLandscapePhone = false,
  isSmallScreen = false,
  calendarHeight = 500,
}: CustomToolbarProps) {
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

  // Determine compact styling
  const isVerySmallCalendar = calendarHeight <= 300;
  const isCompactDevice =
    isLandscapePhone || isSmallScreen || isVerySmallCalendar;

  // Always show both Hebrew and Gregorian months, adjust format based on space
  let title = '';
  if (isVerySmallCalendar) {
    // Ultra-compact: abbreviated Gregorian but still show both
    const shortGregorian = moment(date).format('MMM YY');
    title =
      i18n.language === 'he'
        ? `${hebrewDateStr} (${shortGregorian})`
        : `${shortGregorian} (${hebrewDateStr})`;
  } else if (isCompactDevice) {
    // Compact: abbreviated Gregorian format
    const shortGregorian = moment(date).format('MMM YYYY');
    title =
      i18n.language === 'he'
        ? `${hebrewDateStr} (${shortGregorian})`
        : `${shortGregorian} (${hebrewDateStr})`;
  } else {
    // Full format for larger screens
    title =
      i18n.language === 'he'
        ? `${hebrewDateStr} (${gregorianDateStr})`
        : `${gregorianDateStr} (${hebrewDateStr})`;
  }

  // Dynamic toolbar classes for responsive sizing
  const toolbarClasses = [
    'rbc-toolbar',
    isVerySmallCalendar ? 'rbc-toolbar-compact' : '',
    isCompactDevice ? 'rbc-toolbar-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Handle button press to prevent stuck active state
  const handleButtonPress = (
    action: 'PREV' | 'TODAY' | 'NEXT',
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    // Force blur to remove active/focus state
    event.currentTarget.blur();
    onNavigate(action);
  };

  // Mobile-specific touch handler to prevent hover stuck states
  const handleTouchEnd = (event: React.TouchEvent<HTMLButtonElement>) => {
    // Force blur immediately
    event.currentTarget.blur();
    // Force a style reset on mobile by temporarily removing hover classes
    const button = event.currentTarget;
    button.style.backgroundColor = 'initial';
    button.style.transform = 'none';
    button.style.boxShadow = 'none';

    // Reset after a short delay to ensure hover state is cleared
    setTimeout(() => {
      button.style.backgroundColor = '';
      button.style.transform = '';
      button.style.boxShadow = '';
    }, 50);
  };

  return (
    <div className={toolbarClasses}>
      <span className='rbc-btn-group'>
        <button
          type='button'
          onClick={(e) => handleButtonPress('PREV', e)}
          onMouseUp={(e) => e.currentTarget.blur()}
          onTouchEnd={handleTouchEnd}
        >
          {i18n.language === 'he' ? '→' : '←'}
        </button>
        <button
          type='button'
          onClick={(e) => handleButtonPress('TODAY', e)}
          onMouseUp={(e) => e.currentTarget.blur()}
          onTouchEnd={handleTouchEnd}
        >
          {t('Today')}
        </button>
        <button
          type='button'
          onClick={(e) => handleButtonPress('NEXT', e)}
          onMouseUp={(e) => e.currentTarget.blur()}
          onTouchEnd={handleTouchEnd}
        >
          {i18n.language === 'he' ? '←' : '→'}
        </button>
      </span>
      <span className='rbc-toolbar-label'>{title}</span>
      <span className='rbc-btn-group'></span>
    </div>
  );
}
