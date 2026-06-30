export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_VALIDATION_MESSAGE =
  'slug must be lowercase letters, numbers, and hyphens';

export const SLUG_MAX_LENGTH = 100;

export function slugify(name: string, maxLength = SLUG_MAX_LENGTH): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}
