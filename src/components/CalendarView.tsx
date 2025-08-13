'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, ToolbarProps } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/he';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import CustomToolbar from './CustomToolbar';
import { HDate, gematriya } from '@hebcal/core';
import EventForm from './EventForm';
import DayEvents from './DayEvents';
import EventDetails from './EventDetails';
import CalendarHeader from './CalendarHeader';
import LoadingSpinner from './LoadingSpinner';
import { Event } from '@/types/event';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import {
  generateEventOccurrences,
  EventOccurrence,
} from '@/utils/hebrewDateUtils';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const { t, i18n } = useTranslation();
  const {
    events: masterEvents,
    isLoading,
    isCreating,
    isSaving,
    isDeleting,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventOccurrence | null>(
    null,
  );
  const [date, setDate] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  // Separate touch detection from layout preferences
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(500);
  const [isMobileEventModalOpen, setIsMobileEventModalOpen] = useState(false);

  // Detect device capabilities and screen size
  useEffect(() => {
    const checkDevice = () => {
      // Detect touch capability (for day clicking)
      const hasTouchSupport =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).msMaxTouchPoints > 0;

      // Smart layout detection using multiple factors
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Use modal layout when:
      // 1. Very small screens (phones) - width < 640px
      // 2. Limited height regardless of width - height < 600px (landscape phones/tablets)
      // 3. Small total area (small devices) - area < 400,000 pixels
      const isVerySmallWidth = width < 640;
      const isLimitedHeight = height < 600;
      const isSmallArea = width * height < 400000; // ~632x632 equivalent

      const newIsSmallScreen =
        isVerySmallWidth || isLimitedHeight || isSmallArea;

      // Detect landscape phone layout (phones in landscape orientation)
      const newIsLandscapePhone =
        width > height && width < 1024 && width >= 640;

      // Dynamic calendar height based on screen size and available space
      let newCalendarHeight = 500; // Default height for tablets/desktop

      if (newIsLandscapePhone) {
        // Landscape phones - be more aggressive with height usage
        // Account for: app header (~40px compact), calendar toolbar (~30px compact), margins (~20px)
        // Leave minimal space for events list, maximize calendar
        const reservedSpace = isVerySmallWidth && height <= 375 ? 70 : 90; // iPhone SE vs larger phones
        newCalendarHeight = Math.max(280, height - reservedSpace);
      } else if (width <= 375 && height <= 667) {
        // iPhone SE and similar very small devices (375x667)
        newCalendarHeight = 300;
      } else if (width <= 390 && height >= 800 && height < 900) {
        // iPhone 14, iPhone 13 mini, etc. (390x844, etc.)
        newCalendarHeight = 480;
      } else if (width <= 428 && height >= 900) {
        // iPhone 14 Pro Max, iPhone 15 Pro Max, etc. (430x932, 428x926) - utilize the huge screen
        newCalendarHeight = 550;
      } else if (width <= 414 && height >= 850) {
        // iPhone 13 Pro Max, iPhone 12 Pro Max, etc. (414x896)
        newCalendarHeight = 520;
      } else if (width < 640) {
        // Other phones (iPhone 12, iPhone 13, etc.)
        newCalendarHeight = 450;
      }

      const touchChanged = hasTouchSupport !== isTouchDevice;
      const screenChanged = newIsSmallScreen !== isSmallScreen;
      const landscapeChanged = newIsLandscapePhone !== isLandscapePhone;
      const heightChanged = newCalendarHeight !== calendarHeight;

      if (touchChanged || screenChanged || landscapeChanged || heightChanged) {
        setIsTouchDevice(hasTouchSupport);
        setIsSmallScreen(newIsSmallScreen);
        setIsLandscapePhone(newIsLandscapePhone);
        setCalendarHeight(newCalendarHeight);

        // Force calendar re-render if touch detection changed
        if (touchChanged) {
          setCalendarKey((prev) => prev + 1);
        }

        // Debug log for development (remove in production)
        if (
          process.env.NODE_ENV === 'development' &&
          (screenChanged || heightChanged)
        ) {
          console.log('Layout decision:', {
            width,
            height,
            area: width * height,
            isVerySmallWidth,
            isLimitedHeight,
            isSmallArea,
            useModal: newIsSmallScreen,
            calendarHeight: newCalendarHeight,
          });
        }
      }
    };

    // Check initial device
    checkDevice();

    // Listen for viewport changes
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, [isTouchDevice, isSmallScreen, isLandscapePhone, calendarHeight]);

  // Generate event occurrences when events or date changes
  useEffect(() => {
    const startOfMonth = moment(date).startOf('month').toDate();
    const endOfMonth = moment(date).endOf('month').toDate();

    const newOccurrences = generateEventOccurrences(
      masterEvents,
      startOfMonth,
      endOfMonth,
    );

    setOccurrences(newOccurrences);
  }, [masterEvents, date]);

  // Force calendar re-initialization after initial load to ensure mobile works
  useEffect(() => {
    if (!isLoading && masterEvents.length >= 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setCalendarKey((prev) => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isLoading, masterEvents.length]);

  // Add hover plus buttons to calendar day cells (desktop only)
  useEffect(() => {
    // Only add buttons on desktop (non-touch devices)
    if (isTouchDevice) {
      return;
    }

    let isUpdatingButtons = false;

    const addPlusButtons = () => {
      if (isUpdatingButtons) {
        return;
      }

      isUpdatingButtons = true;

      // Temporarily disconnect observer to prevent infinite loops
      observer.disconnect();

      // First, clean up any existing button setup
      const existingButtons = document.querySelectorAll('.desktop-add-btn');
      existingButtons.forEach((btn) => btn.remove());

      document.querySelectorAll('[data-row-id]').forEach((row) => {
        // Remove old event listeners by removing data attributes
        row.removeAttribute('data-row-id');
        row.removeAttribute('data-has-mousemove');
      });

      // Now add fresh buttons and event listeners
      const monthRows = document.querySelectorAll('.rbc-month-row');
      if (!monthRows.length) {
        return;
      }

      // Set up each row with full cell hover detection
      monthRows.forEach((monthRow, rowIndex) => {
        const rowElement = monthRow as HTMLElement;
        const rowId = `row-${rowIndex}`;
        rowElement.setAttribute('data-row-id', rowId);

        // Get all day cells in this row (the complete calendar cells)
        const dayCells = monthRow.querySelectorAll('.rbc-date-cell');
        const dayBgs = monthRow.querySelectorAll('.rbc-day-bg');
        const buttonsInRow: {
          button: HTMLButtonElement;
          dayBg: HTMLElement;
          dateCell: HTMLElement;
        }[] = [];

        // Add a plus button to each day background, but listen to entire cell
        dayCells.forEach((dateCell, colIndex) => {
          const dateCellElement = dateCell as HTMLElement;
          const dayBgElement = dayBgs[colIndex] as HTMLElement;

          if (!dayBgElement) {
            return; // Skip if no corresponding day background
          }

          // Make sure the day background has relative positioning for the button
          if (
            dayBgElement.style.position !== 'relative' &&
            dayBgElement.style.position !== 'absolute'
          ) {
            dayBgElement.style.position = 'relative';
          }

          // Create plus button and add to day background
          const button = document.createElement('button');
          button.className = 'desktop-add-btn';
          button.innerHTML = '+';
          button.title = t('Add event');
          button.type = 'button';

          // Style the button properly (hidden by default, shown on hover)
          button.style.position = 'fixed';
          button.style.width = '20px';
          button.style.height = '20px';
          button.style.opacity = '0';
          button.style.visibility = 'hidden';
          button.style.transform = 'scale(0.8)';
          button.style.pointerEvents = 'auto';
          button.style.backgroundColor = '#3b82f6';
          button.style.color = 'white';
          button.style.border = 'none';
          button.style.borderRadius = '50%';
          button.style.cursor = 'pointer';
          button.style.fontSize = '14px';
          button.style.fontWeight = 'bold';
          button.style.display = 'flex';
          button.style.alignItems = 'center';
          button.style.justifyContent = 'center';
          button.style.transition = 'all 0.2s ease';
          button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

          // Add hover effects
          button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#2563eb';
            button.style.transform = 'scale(1)';
          });

          button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#3b82f6';
            button.style.transform = 'scale(0.8)';
          });

          // Calculate global index for finding date
          const _globalIndex = rowIndex * 7 + colIndex;

          // Add click handler to open modal with correct date
          button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // More robust date extraction - look specifically in the date header area
            let dayNum: number | null = null;

            // Method 1: Look for date in the dateCell's direct children (date header)
            const dateHeaderElements =
              dateCellElement.querySelectorAll('div > span, span');
            for (const element of dateHeaderElements) {
              const text = element.textContent?.trim();
              const match = text?.match(/^(\d{1,2})/);
              if (match && !isNaN(parseInt(match[1]))) {
                dayNum = parseInt(match[1]);
                break;
              }
            }

            // Method 2: If that fails, try the broader text content approach but be more selective
            if (dayNum === null) {
              const allText = dateCellElement.textContent || '';
              // Look for 1-2 digits at the start, ignoring event text
              const match = allText.match(/^\s*(\d{1,2})/);
              if (match && !isNaN(parseInt(match[1]))) {
                dayNum = parseInt(match[1]);
              }
            }

            // Method 3: Calculate from position if extraction fails
            if (dayNum === null) {
              // Calculate day number from grid position
              const startOfMonth = new Date(
                date.getFullYear(),
                date.getMonth(),
                1,
              );
              const firstDayOfWeek = startOfMonth.getDay();
              const estimatedDay = rowIndex * 7 + colIndex - firstDayOfWeek + 1;

              // Validate the estimated day is within the month
              const daysInMonth = new Date(
                date.getFullYear(),
                date.getMonth() + 1,
                0,
              ).getDate();
              if (estimatedDay >= 1 && estimatedDay <= daysInMonth) {
                dayNum = estimatedDay;
              }
            }

            if (dayNum !== null && dayNum >= 1 && dayNum <= 31) {
              const cellDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                dayNum,
              );
              setSelectedDate(cellDate);
              setSelectedEvent(null);
              setIsModalOpen(true);
            } else {
              // Fallback to current date if all methods fail
              console.warn(
                'Could not extract day number, using current date as fallback',
              );
              setSelectedDate(new Date());
              setSelectedEvent(null);
              setIsModalOpen(true);
            }
          });

          // Instead of adding to dayBg, add to document body with absolute positioning
          // This bypasses any CSS blocking issues within the calendar
          document.body.appendChild(button);

          // Position the button over the cell using getBoundingClientRect
          const updateButtonPosition = () => {
            const rect = dayBgElement.getBoundingClientRect();
            button.style.position = 'fixed'; // Use fixed instead of absolute
            button.style.left = `${rect.right - 28}px`; // 4px margin from right edge
            button.style.top = `${rect.top + 4}px`; // 4px margin from top edge
            button.style.zIndex = '999999'; // Extremely high z-index
          };

          // Position initially
          updateButtonPosition();

          // Update position on scroll/resize
          window.addEventListener('scroll', updateButtonPosition);
          window.addEventListener('resize', updateButtonPosition);
          buttonsInRow.push({
            button,
            dayBg: dayBgElement,
            dateCell: dateCellElement,
          });
        });

        // Store button info for later use in global event detection
        (
          rowElement as HTMLElement & { __buttonsInRow: typeof buttonsInRow }
        ).__buttonsInRow = buttonsInRow;
      });

      // SOLUTION: Use global event detection on the entire month view
      // Events are positioned absolutely and not inside date cells
      const monthView = document.querySelector('.rbc-month-view');
      if (monthView) {
        const handleGlobalMouseOver = (e: MouseEvent) => {
          // Get the mouse position
          const mouseEvent = e;
          const x = mouseEvent.clientX;
          const y = mouseEvent.clientY;

          // Find which day cell this position corresponds to
          monthRows.forEach((monthRow) => {
            const buttonsInRow = (
              monthRow as HTMLElement & {
                __buttonsInRow?: {
                  button: HTMLButtonElement;
                  dayBg: HTMLElement;
                }[];
              }
            ).__buttonsInRow;
            if (!buttonsInRow) {
              return;
            }

            buttonsInRow.forEach(
              ({
                button,
                dayBg,
              }: {
                button: HTMLButtonElement;
                dayBg: HTMLElement;
              }) => {
                const rect = dayBg.getBoundingClientRect();

                // Check if mouse is within this day cell's bounds
                if (
                  x >= rect.left &&
                  x <= rect.right &&
                  y >= rect.top &&
                  y <= rect.bottom
                ) {
                  button.style.opacity = '1';
                  button.style.visibility = 'visible';
                  button.style.transform = 'scale(1)';
                }
              },
            );
          });
        };

        const handleGlobalMouseOut = (e: MouseEvent) => {
          const mouseEvent = e;
          const relatedTarget = mouseEvent.relatedTarget as HTMLElement;

          // Don't hide if moving to a button
          if (
            relatedTarget &&
            relatedTarget.classList.contains('desktop-add-btn')
          ) {
            return;
          }

          // Hide all buttons that the mouse is not over
          monthRows.forEach((monthRow) => {
            const buttonsInRow = (
              monthRow as HTMLElement & {
                __buttonsInRow?: {
                  button: HTMLButtonElement;
                  dayBg: HTMLElement;
                }[];
              }
            ).__buttonsInRow;
            if (!buttonsInRow) {
              return;
            }

            buttonsInRow.forEach(
              ({
                button,
                dayBg,
              }: {
                button: HTMLButtonElement;
                dayBg: HTMLElement;
              }) => {
                const rect = dayBg.getBoundingClientRect();
                const x = mouseEvent.clientX;
                const y = mouseEvent.clientY;

                // Hide button if mouse is not within this day cell's bounds
                if (
                  !(
                    x >= rect.left &&
                    x <= rect.right &&
                    y >= rect.top &&
                    y <= rect.bottom
                  )
                ) {
                  button.style.opacity = '0';
                  button.style.visibility = 'hidden';
                  button.style.transform = 'scale(0.8)';
                }
              },
            );
          });
        };

        // Listen to the entire month view for mouse events
        monthView.addEventListener(
          'mouseover',
          handleGlobalMouseOver as EventListener,
        );
        monthView.addEventListener(
          'mouseout',
          handleGlobalMouseOut as EventListener,
        );

        // Also keep button hover behavior
        monthRows.forEach((monthRow) => {
          const buttonsInRow = (
            monthRow as HTMLElement & {
              __buttonsInRow?: { button: HTMLButtonElement }[];
            }
          ).__buttonsInRow;
          if (!buttonsInRow) {
            return;
          }

          buttonsInRow.forEach(({ button }) => {
            button.addEventListener('mouseenter', () => {
              button.style.opacity = '1';
              button.style.visibility = 'visible';
              button.style.transform = 'scale(1)';
            });
            button.addEventListener('mouseleave', () => {
              button.style.opacity = '0';
              button.style.visibility = 'hidden';
              button.style.transform = 'scale(0.8)';
            });
          });
        });
      }

      // Re-enable mutation observer after button setup is complete
      setTimeout(() => {
        isUpdatingButtons = false;

        // Reconnect the observer
        const calendarElement = document.querySelector('.rbc-calendar');
        if (calendarElement) {
          observer.observe(calendarElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-date'],
          });
        }
      }, 100);
    };

    // Add buttons after a short delay to ensure calendar is rendered
    const timer = setTimeout(addPlusButtons, 500);

    // Debounced button re-adding to prevent flickering
    let debounceTimer: NodeJS.Timeout;
    const _debouncedAddButtons = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(addPlusButtons, 300);
    };

    // TEMPORARILY DISABLED: Re-add buttons when calendar re-renders (month changes, etc.)
    // The MutationObserver is causing continuous button recreation - disabling for testing
    const observer = new MutationObserver(() => {
      // Completely disabled for now
    });

    // Don't observe anything for now
    // const calendarElement = document.querySelector('.rbc-calendar');
    // if (calendarElement) {
    //   observer.observe(calendarElement, {
    //     childList: true,
    //     subtree: true,
    //     attributes: true,
    //     attributeFilter: ['class', 'data-date'] // Only watch relevant attributes
    //   });
    // }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      // Clean up existing buttons
      const existingButtons = document.querySelectorAll('.desktop-add-btn');
      existingButtons.forEach((btn) => btn.remove());
    };
  }, [isTouchDevice, date, t, calendarKey]); // Re-run when these change

  // Set moment locale when language changes
  useEffect(() => {
    moment.locale(
      i18n.language === 'he' ? 'he' : i18n.language === 'es' ? 'es' : 'en',
    );
  }, [i18n.language]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setSelectedEvent(null);
  };

  // Fallback day selection handler for mobile
  const handleDaySelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
  }, []);

  const handleAddEvent = async (event: Omit<Event, 'id'>) => {
    const success = await createEvent(event);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleSelectEvent = (event: EventOccurrence) => {
    setSelectedEvent(event);
    setSelectedDate(event.start);

    // Only use modal on small screens (phones), not tablets
    if (isSmallScreen) {
      setIsMobileEventModalOpen(true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const success = await deleteEvent(id);
    if (success) {
      setSelectedEvent(null);
      // Close modal if open on small screens
      if (isSmallScreen) {
        setIsMobileEventModalOpen(false);
      }
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const success = await updateEvent(event);
    if (success && selectedEvent) {
      setSelectedEvent({ ...selectedEvent, ...event });
      // Close modal if open on small screens
      if (isSmallScreen) {
        setIsMobileEventModalOpen(false);
      }
    }
  };

  const handleCloseMobileEventModal = () => {
    setIsMobileEventModalOpen(false);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const dayPropGetter = (date: Date) => {
    if (selectedDate && moment(date).isSame(selectedDate, 'day')) {
      return {
        style: {
          backgroundColor: '#3b82f6',
          color: 'white',
        },
      };
    }
    return {};
  };

  // Memoize expensive calculations
  const dayEvents = useMemo(
    () =>
      occurrences.filter((event) =>
        moment(event.start).isSame(selectedDate, 'day'),
      ),
    [occurrences, selectedDate],
  );

  // Memoize calendar messages to avoid recreation on every render
  const calendarMessages = useMemo(
    () => ({
      previous: '→',
      next: '←',
      today: t('Today'),
      month: t('Month'),
      week: t('Week'),
      day: t('Day'),
      agenda: t('Agenda'),
      date: t('Date'),
      time: t('Time'),
      event: t('Event'),
      showMore: (total: number) => `+${total} ${t('more')}`,
    }),
    [t],
  );

  // Show loading spinner while initial data loads
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <CalendarHeader
        isLandscapePhone={isLandscapePhone}
        isSmallScreen={isSmallScreen}
        calendarHeight={calendarHeight}
      />
      {isLandscapePhone ? (
        /* Landscape phone layout - calendar and events side by side with automatic RTL */
        <div className='grid grid-cols-2 gap-2 mt-2'>
          <Calendar
            key={calendarKey}
            localizer={localizer}
            events={occurrences}
            startAccessor='start'
            endAccessor='end'
            style={{ height: calendarHeight }}
            rtl={i18n.language === 'he'}
            selectable={true}
            date={date}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            messages={calendarMessages}
            dayPropGetter={dayPropGetter}
            components={{
              toolbar: (props: ToolbarProps<EventOccurrence>) => (
                <CustomToolbar
                  {...props}
                  isLandscapePhone={isLandscapePhone}
                  isSmallScreen={isSmallScreen}
                  calendarHeight={calendarHeight}
                />
              ),
              month: {
                dateHeader: ({ date, label }) => {
                  const hdate = new HDate(date);
                  const isSelected =
                    selectedDate && moment(date).isSame(selectedDate, 'day');

                  // Count events for this day
                  const dayEventCount = occurrences.filter((event) =>
                    moment(event.start).isSame(date, 'day'),
                  ).length;

                  // Adapt layout based on calendar height
                  const isVerySmallCalendar = calendarHeight <= 300;

                  // Touch device click handler
                  const handleTouchClick = (
                    e: React.MouseEvent | React.TouchEvent,
                  ) => {
                    // Handle clicks on all touch devices (phones, tablets, etc.)
                    if (isTouchDevice) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDaySelect(date);
                    }
                  };

                  return (
                    <div
                      className={`flex ${isVerySmallCalendar ? 'flex-col justify-center items-center' : 'flex-col items-center'} w-full h-full ${
                        isTouchDevice ? 'cursor-pointer' : ''
                      }`}
                      style={{
                        minHeight: isVerySmallCalendar ? '32px' : '40px',
                        display: 'flex',
                        padding: isVerySmallCalendar ? '1px 2px' : '4px',
                        touchAction: 'manipulation',
                        // On desktop, allow hover for plus buttons
                        pointerEvents: 'auto',
                      }}
                      onClick={handleTouchClick}
                      onTouchEnd={handleTouchClick}
                    >
                      {isVerySmallCalendar ? (
                        // Ultra-compact layout for very small screens - everything in one line
                        <div className='flex items-center justify-center w-full h-full space-x-1'>
                          <span
                            className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            {label}
                          </span>
                          {dayEventCount > 0 && (
                            <span
                              className={`inline-flex items-center justify-center w-3 h-3 text-xs rounded-full ${
                                isSelected
                                  ? 'bg-white text-blue-600'
                                  : 'bg-blue-600 text-white'
                              }`}
                              style={{ fontSize: '9px', lineHeight: '1' }}
                            >
                              {dayEventCount > 9 ? '9' : dayEventCount}
                            </span>
                          )}
                          <span
                            className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            style={{ fontSize: '10px' }}
                          >
                            {gematriya(hdate.getDate())}
                          </span>
                        </div>
                      ) : (
                        // Standard vertical layout for larger screens
                        <>
                          <div className='flex items-center space-x-1'>
                            <span
                              className={
                                isSelected
                                  ? 'text-white'
                                  : 'text-gray-900 dark:text-gray-100'
                              }
                            >
                              {label}
                            </span>
                            {dayEventCount > 0 && (
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                                  isSelected
                                    ? 'bg-white text-blue-600'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {dayEventCount > 9 ? '9+' : dayEventCount}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                          >
                            {gematriya(hdate.getDate())}
                          </span>
                        </>
                      )}
                    </div>
                  );
                },
                event: ({ event }) => {
                  // Custom event component that doesn't interfere with day selection
                  return (
                    <div
                      className='rbc-event-content'
                      title={event.title}
                      style={{ position: 'relative', zIndex: 2 }}
                    >
                      {event.title}
                    </div>
                  );
                },
              },
            }}
          />
          <DayEvents
            events={dayEvents}
            onSelectEvent={handleSelectEvent}
            onAddEvent={() => setIsModalOpen(true)}
            selectedDate={selectedDate}
          />
        </div>
      ) : (
        /* Portrait phones and tablets - normal layout */
        <>
          <Calendar
            key={calendarKey}
            localizer={localizer}
            events={occurrences}
            startAccessor='start'
            endAccessor='end'
            style={{ height: calendarHeight }}
            rtl={i18n.language === 'he'}
            selectable={true}
            date={date}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            messages={calendarMessages}
            dayPropGetter={dayPropGetter}
            components={{
              toolbar: (props: ToolbarProps<EventOccurrence>) => (
                <CustomToolbar
                  {...props}
                  isLandscapePhone={isLandscapePhone}
                  isSmallScreen={isSmallScreen}
                  calendarHeight={calendarHeight}
                />
              ),
              month: {
                dateHeader: ({ date, label }) => {
                  const hdate = new HDate(date);
                  const isSelected =
                    selectedDate && moment(date).isSame(selectedDate, 'day');

                  // Count events for this day
                  const dayEventCount = occurrences.filter((event) =>
                    moment(event.start).isSame(date, 'day'),
                  ).length;

                  // Adapt layout based on calendar height
                  const isVerySmallCalendar = calendarHeight <= 300;

                  // Touch device click handler
                  const handleTouchClick = (
                    e: React.MouseEvent | React.TouchEvent,
                  ) => {
                    // Handle clicks on all touch devices (phones, tablets, etc.)
                    if (isTouchDevice) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDaySelect(date);
                    }
                  };

                  return (
                    <div
                      className={`flex ${isVerySmallCalendar ? 'flex-col justify-center items-center' : 'flex-col items-center'} w-full h-full ${
                        isTouchDevice ? 'cursor-pointer' : ''
                      }`}
                      style={{
                        minHeight: isVerySmallCalendar ? '32px' : '40px',
                        display: 'flex',
                        padding: isVerySmallCalendar ? '1px 2px' : '4px',
                        touchAction: 'manipulation',
                        // Allow hover events for desktop plus buttons
                        pointerEvents: 'auto',
                      }}
                      onClick={handleTouchClick}
                      onTouchEnd={handleTouchClick}
                    >
                      {isVerySmallCalendar ? (
                        // Ultra-compact layout for very small screens - everything in one line
                        <div className='flex items-center justify-center w-full h-full space-x-1'>
                          <span
                            className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            {label}
                          </span>
                          {dayEventCount > 0 && (
                            <span
                              className={`inline-flex items-center justify-center w-3 h-3 text-xs rounded-full ${
                                isSelected
                                  ? 'bg-white text-blue-600'
                                  : 'bg-blue-600 text-white'
                              }`}
                              style={{ fontSize: '9px', lineHeight: '1' }}
                            >
                              {dayEventCount > 9 ? '9' : dayEventCount}
                            </span>
                          )}
                          <span
                            className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            style={{ fontSize: '10px' }}
                          >
                            {gematriya(hdate.getDate())}
                          </span>
                        </div>
                      ) : (
                        // Standard vertical layout for larger screens
                        <>
                          <div className='flex items-center space-x-1'>
                            <span
                              className={
                                isSelected
                                  ? 'text-white'
                                  : 'text-gray-900 dark:text-gray-100'
                              }
                            >
                              {label}
                            </span>
                            {dayEventCount > 0 && (
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${
                                  isSelected
                                    ? 'bg-white text-blue-600'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {dayEventCount > 9 ? '9+' : dayEventCount}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                          >
                            {gematriya(hdate.getDate())}
                          </span>
                        </>
                      )}
                    </div>
                  );
                },
                event: ({ event }) => {
                  // Custom event component that doesn't interfere with day selection
                  return (
                    <div
                      className='rbc-event-content'
                      title={event.title}
                      style={{ position: 'relative', zIndex: 2 }}
                    >
                      {event.title}
                    </div>
                  );
                },
              },
            }}
          />
          <div
            className={`${isSmallScreen ? 'mt-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'} ${i18n.language === 'he' ? 'md:grid-flow-col-dense' : ''}`}
          >
            <DayEvents
              events={dayEvents}
              onSelectEvent={handleSelectEvent}
              onAddEvent={() => setIsModalOpen(true)}
              selectedDate={selectedDate}
            />
            {/* Hide EventDetails only on small screens (phones) - tablets get two-panel view */}
            {!isSmallScreen && (
              <EventDetails
                event={selectedEvent}
                onDelete={handleDeleteEvent}
                onSave={handleSaveEvent}
                isSaving={isSaving}
                isDeleting={isDeleting}
              />
            )}
          </div>
        </>
      )}
      {/* Event creation modal */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 z-50 flex justify-center items-center'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-600'>
            <EventForm
              onAddEvent={handleAddEvent}
              isCreating={isCreating}
              selectedDate={selectedDate}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className='mt-4 w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200'
            >
              {t('Close')}
            </button>
          </div>
        </div>
      )}

      {/* Small screen event details modal (phones only) */}
      {isMobileEventModalOpen && selectedEvent && (
        <div className='fixed inset-0 bg-black dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 z-50 flex justify-center items-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-600'>
            <div className='flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'>
              <h2
                className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${
                  i18n.language === 'he' ? 'text-right' : 'text-left'
                }`}
              >
                {t('Event Details')}
              </h2>
              <button
                onClick={handleCloseMobileEventModal}
                className='text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400'
                aria-label={t('Close')}
              >
                ×
              </button>
            </div>
            <div className='p-4 overflow-y-auto bg-white dark:bg-gray-800'>
              <EventDetails
                event={selectedEvent}
                onDelete={handleDeleteEvent}
                onSave={handleSaveEvent}
                isSaving={isSaving}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
