import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  formatDateInputDisplay,
  getCalendarMonthDays,
  getMonthLabel,
  getTodayDateInput,
  getViewFromValue,
  shiftMonth,
} from '../../lib/calendar';
import { toDateInputValue } from '../../lib/format';
import { fieldClass } from './Form';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

type PopoverPosition = {
  top: number;
  left: number;
  maxHeight?: number;
};

const POPOVER_WIDTH = 328;
const POPOVER_ESTIMATED_HEIGHT = 400;
const DEFAULT_PLACEHOLDER = 'Select date';

function computePopoverPosition(
  anchorRect: DOMRect,
  popoverHeight: number,
): PopoverPosition {
  const gap = 10;
  const viewportPadding = 12;
  const width = Math.min(window.innerWidth - viewportPadding * 2, POPOVER_WIDTH);
  const top = anchorRect.bottom + gap;
  const availableBelow = window.innerHeight - top - viewportPadding;
  const maxHeight =
    availableBelow < popoverHeight
      ? Math.max(220, availableBelow)
      : undefined;

  const left = Math.max(
    viewportPadding,
    Math.min(anchorRect.left, window.innerWidth - width - viewportPadding),
  );

  return { top, left, maxHeight };
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 4L6 8L10 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function CalendarPopover({
  calendarId,
  value,
  viewYear,
  viewMonth,
  onViewChange,
  onSelect,
  onClear,
  onToday,
  onClose,
  position,
  popoverRef,
}: {
  calendarId: string;
  value: string;
  viewYear: number;
  viewMonth: number;
  onViewChange: (year: number, month: number) => void;
  onSelect: (date: string) => void;
  onClear: () => void;
  onToday: () => void;
  onClose: () => void;
  position: PopoverPosition;
  popoverRef: RefObject<HTMLDivElement | null>;
}) {
  const today = getTodayDateInput();
  const days = getCalendarMonthDays(viewYear, viewMonth);
  const { year: prevYear, month: prevMonth } = shiftMonth(viewYear, viewMonth, -1);
  const { year: nextYear, month: nextMonth } = shiftMonth(viewYear, viewMonth, 1);
  const selectedDate = toDateInputValue(value);

  return createPortal(
    <div
      ref={popoverRef}
      data-date-picker-popover
      id={calendarId}
      role="dialog"
      aria-modal="true"
      aria-label="Choose date"
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-[9999] flex w-[min(100vw-1.5rem,20.5rem)] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/98 p-4 shadow-[0_16px_48px_rgba(26,37,96,0.18)] backdrop-blur-xl animate-fade-up"
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onViewChange(prevYear, prevMonth)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <ChevronLeftIcon />
        </button>
        <p className="text-sm font-semibold tracking-tight text-slate-900">
          {getMonthLabel(viewYear, viewMonth)}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onViewChange(nextYear, nextMonth)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((weekday, index) => (
            <div
              key={`${weekday}-${index}`}
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayNumber = day.date.slice(8, 10).replace(/^0/, '');
            const isSelected = selectedDate === day.date;
            const isToday = today === day.date;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  onSelect(day.date);
                  onClose();
                }}
                className={`flex h-10 items-center justify-center rounded-xl text-sm font-medium transition ${
                  isSelected
                    ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/25'
                    : isToday
                      ? 'border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : day.inMonth
                        ? 'text-slate-800 hover:bg-brand-50 hover:text-brand-700'
                        : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
                }`}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => {
            onClear();
            onClose();
          }}
          className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            onToday();
            onClose();
          }}
          className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        >
          Today
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function DatePickerInput({
  value,
  onChange,
  id,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  required = false,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => getViewFromValue(toDateInputValue(value)));
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const pickerValue = toDateInputValue(value);
  const displayValue = pickerValue ? formatDateInputDisplay(pickerValue) : '';
  const previousPickerValue = useRef(pickerValue);

  useEffect(() => {
    if (previousPickerValue.current !== pickerValue && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
    previousPickerValue.current = pickerValue;
  }, [pickerValue, open]);

  function openCalendar() {
    if (disabled) {
      return;
    }
    setView(getViewFromValue(pickerValue));
    setOpen(true);
  }

  function closeCalendar() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    setPosition(computePopoverPosition(rect, POPOVER_ESTIMATED_HEIGHT));
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current || !popoverRef.current) {
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    setPosition(
      computePopoverPosition(rect, popoverRef.current.offsetHeight),
    );
  }, [open, view.year, view.month, pickerValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !(event.target as Element).closest('[data-date-picker-popover]')
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        closeCalendar();
      } else {
        openCalendar();
      }
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeCalendar();
    }
  }

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={pickerValue}
          onChange={() => undefined}
          required
        />
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={calendarId}
        onClick={() => (open ? closeCalendar() : openCalendar())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 text-left ${fieldClass} ${
          open ? 'border-brand-400 ring-2 ring-brand-100/80' : ''
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {displayValue ? (
            <span className="text-slate-800">{displayValue}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <CalendarIcon className="h-5 w-5 shrink-0 text-brand-600" />
      </button>

      {open && position ? (
        <CalendarPopover
          calendarId={calendarId}
          value={pickerValue}
          viewYear={view.year}
          viewMonth={view.month}
          onViewChange={(year, month) => setView({ year, month })}
          onSelect={onChange}
          onClear={() => onChange('')}
          onToday={() => onChange(getTodayDateInput())}
          onClose={() => setOpen(false)}
          position={position}
          popoverRef={popoverRef}
        />
      ) : null}
    </div>
  );
}
