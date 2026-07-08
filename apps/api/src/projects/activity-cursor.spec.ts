import {
  buildActivityCursorWhere,
  compareActivityItems,
  decodeActivityCursor,
  encodeActivityCursor,
} from './activity-cursor.js';

describe('activity cursor', () => {
  it('round-trips cursor payloads', () => {
    const payload = {
      occurredAt: '2026-07-08T12:00:00.000Z',
      id: 'evt-1',
      type: 'task_event',
    };

    const encoded = encodeActivityCursor(payload);
    expect(decodeActivityCursor(encoded)).toEqual(payload);
  });

  it('builds stable pagination filter for equal timestamps', () => {
    const where = buildActivityCursorWhere({
      occurredAt: '2026-07-08T12:00:00.000Z',
      id: 'evt-2',
      type: 'task_event',
    });

    expect(where).toEqual({
      OR: [
        { createdAt: { lt: new Date('2026-07-08T12:00:00.000Z') } },
        {
          createdAt: new Date('2026-07-08T12:00:00.000Z'),
          id: { lt: 'evt-2' },
        },
      ],
    });
  });

  it('sorts items deterministically by occurredAt then id', () => {
    const left = { occurredAt: new Date('2026-07-08T12:00:00.000Z'), id: 'b' };
    const right = { occurredAt: new Date('2026-07-08T12:00:00.000Z'), id: 'a' };

    expect(compareActivityItems(left, right)).toBeLessThan(0);
    expect(compareActivityItems(right, left)).toBeGreaterThan(0);
  });
});
