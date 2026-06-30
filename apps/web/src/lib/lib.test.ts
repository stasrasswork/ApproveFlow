import { describe, expect, it } from 'vitest';
import {
  assigneeNeedsProjectAccess,
  filterAssignableMembers,
} from './members';
import { isValidSlug, slugify } from './slug';
import { getEventTypeLabel } from './task-events';
import { isAgencyRole } from './roles';

describe('getEventTypeLabel', () => {
  it('labels handoff acknowledgement', () => {
    expect(getEventTypeLabel('HANDOFF_ACK', null)).toBe(
      'Client accepted for review',
    );
  });

  it('labels client approval types', () => {
    expect(getEventTypeLabel('CLIENT_APPROVAL', 'APPROVED')).toBe(
      'Client approved',
    );
    expect(getEventTypeLabel('CLIENT_APPROVAL', 'CHANGES_REQUESTED')).toBe(
      'Client requested changes',
    );
  });

  it('returns null for generic status changes', () => {
    expect(getEventTypeLabel('STATUS_CHANGED', null)).toBeNull();
  });
});

describe('members', () => {
  it('filters assignable workspace members', () => {
    const members = [
      { id: '1', userId: 'a', role: 'ADMIN' as const, workspaceId: 'w', createdAt: '', user: { id: 'a', email: 'a@t', name: null } },
      { id: '2', userId: 'b', role: 'CLIENT_VIEW' as const, workspaceId: 'w', createdAt: '', user: { id: 'b', email: 'b@t', name: null } },
    ];
    expect(filterAssignableMembers(members)).toHaveLength(1);
    expect(filterAssignableMembers(members)[0].userId).toBe('a');
  });

  it('detects assignee missing from project', () => {
    const memberIds = new Set(['u1']);
    expect(assigneeNeedsProjectAccess('u2', memberIds)).toBe(true);
    expect(assigneeNeedsProjectAccess('u1', memberIds)).toBe(false);
    expect(assigneeNeedsProjectAccess(null, memberIds)).toBe(false);
  });
});

describe('roles', () => {
  it('identifies agency roles', () => {
    expect(isAgencyRole('ADMIN')).toBe(true);
    expect(isAgencyRole('MANAGER')).toBe(true);
    expect(isAgencyRole('MEMBER')).toBe(false);
  });
});

describe('slug', () => {
  it('slugifies workspace names', () => {
    expect(slugify('Acme Creative Agency')).toBe('acme-creative-agency');
  });

  it('validates slug format', () => {
    expect(isValidSlug('my-agency')).toBe(true);
    expect(isValidSlug('My Agency')).toBe(false);
  });
});
