export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function userDisplayName(
  user: { name: string | null; email: string } | null | undefined,
): string {
  if (!user) {
    return '—';
  }
  return user.name ?? user.email;
}

export function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

export function dateInputToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function daysUntilDue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const target = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDaysUntil(value: string | null | undefined): string | null {
  const diff = daysUntilDue(value);
  if (diff === null) {
    return null;
  }

  if (diff < 0) {
    const overdue = Math.abs(diff);
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
  }
  if (diff === 0) {
    return 'Due today';
  }
  if (diff === 1) {
    return 'Due tomorrow';
  }
  return `Due in ${diff} days`;
}
