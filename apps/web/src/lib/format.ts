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
