import { slugify, SLUG_MAX_LENGTH } from './slug.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Demo Workspace')).toBe('demo-workspace');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });

  it('respects max length', () => {
    const longName = 'a'.repeat(SLUG_MAX_LENGTH + 10);
    expect(slugify(longName)).toHaveLength(SLUG_MAX_LENGTH);
  });
});
