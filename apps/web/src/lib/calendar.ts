export type CalendarDay = {
  date: string;
  inMonth: boolean;
};

export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayDateInput(): string {
  return toLocalDateInputValue(new Date());
}

export function formatDateInputDisplay(value: string): string {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseDateInput(value));
}

export function addDaysToDateInput(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
}

export function getMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

export function getCalendarMonthDays(viewYear: number, viewMonth: number): CalendarDay[] {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    days.push({
      date: toLocalDateInputValue(date),
      inMonth: date.getMonth() === viewMonth,
    });
  }

  return days;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function getViewFromValue(value: string): { year: number; month: number } {
  if (value) {
    const date = parseDateInput(value);
    return { year: date.getFullYear(), month: date.getMonth() };
  }

  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}
