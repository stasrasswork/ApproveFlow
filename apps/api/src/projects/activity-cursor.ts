export type ActivityCursorPayload = {
  occurredAt: string;
  id: string;
  type: string;
};

export function encodeActivityCursor(payload: ActivityCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeActivityCursor(cursor: string): ActivityCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as ActivityCursorPayload;
    if (!parsed.occurredAt || !parsed.id || !parsed.type) {
      throw new Error('Invalid cursor shape');
    }
    return parsed;
  } catch {
    throw new Error('Invalid activity cursor');
  }
}

export function buildActivityCursorWhere(cursor: ActivityCursorPayload | null) {
  if (!cursor) {
    return {};
  }

  const occurredAt = new Date(cursor.occurredAt);
  return {
    OR: [
      { createdAt: { lt: occurredAt } },
      { createdAt: occurredAt, id: { lt: cursor.id } },
    ],
  };
}

export function compareActivityItems(
  left: { occurredAt: Date; id: string },
  right: { occurredAt: Date; id: string },
): number {
  const timeDiff = right.occurredAt.getTime() - left.occurredAt.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return right.id.localeCompare(left.id);
}
