import { describe, expect, it } from 'vitest';
import { getEventTypeLabel } from './task-events';
import { transitionNeedsComment } from './task-status';
import { canChangeTaskStatus, isAgencyRole } from './roles';

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

describe('transitionNeedsComment', () => {
  it('requires comment only for client request changes', () => {
    expect(
      transitionNeedsComment('CLIENT_APPROVAL', 'PRODUCTION', 'CLIENT_VIEW'),
    ).toBe(true);
    expect(
      transitionNeedsComment('INTERNAL_REVIEW', 'PRODUCTION', 'MANAGER'),
    ).toBe(false);
  });
});

describe('roles', () => {
  it('identifies agency roles', () => {
    expect(isAgencyRole('ADMIN')).toBe(true);
    expect(isAgencyRole('MANAGER')).toBe(true);
    expect(isAgencyRole('MEMBER')).toBe(false);
  });

  it('allows status changes for non-members', () => {
    expect(canChangeTaskStatus('MEMBER')).toBe(false);
    expect(canChangeTaskStatus('MANAGER')).toBe(true);
    expect(canChangeTaskStatus('CLIENT_VIEW')).toBe(true);
  });
});
