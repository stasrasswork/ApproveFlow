import {
  ClientApprovalType,
  TaskEventType,
  TaskStatus,
  WorkspaceRole,
} from '../../generated/prisma/client.js';
import {
  assertTransition,
  assertTransitionWithPayload,
  buildAllowedTransitionTargets,
  canTransition,
  getAllowedTargetStatuses,
  getTransitionLabel,
  isKnownTransition,
  requiresComment,
  resolveTransition,
  TransitionNotAllowedError,
  TransitionValidationError,
} from './task-transition.js';

describe('task-transition', () => {
  describe('isKnownTransition', () => {
    it('allows agency path brief → production', () => {
      expect(
        isKnownTransition(TaskStatus.BRIEF, TaskStatus.PRODUCTION),
      ).toBe(true);
    });

    it('forbids skipping client_handoff (internal_review → client_approval)', () => {
      expect(
        isKnownTransition(
          TaskStatus.INTERNAL_REVIEW,
          TaskStatus.CLIENT_APPROVAL,
        ),
      ).toBe(false);
    });

    it('forbids client_approval → done directly', () => {
      expect(
        isKnownTransition(TaskStatus.CLIENT_APPROVAL, TaskStatus.DONE),
      ).toBe(false);
    });
  });

  describe('canTransition', () => {
    it.each([
      [WorkspaceRole.ADMIN, TaskStatus.BRIEF, TaskStatus.PRODUCTION, true],
      [WorkspaceRole.MANAGER, TaskStatus.BRIEF, TaskStatus.PRODUCTION, true],
      [WorkspaceRole.MEMBER, TaskStatus.BRIEF, TaskStatus.PRODUCTION, false],
      [
        WorkspaceRole.CLIENT_VIEW,
        TaskStatus.CLIENT_HANDOFF,
        TaskStatus.CLIENT_APPROVAL,
        true,
      ],
      [
        WorkspaceRole.CLIENT_VIEW,
        TaskStatus.BRIEF,
        TaskStatus.PRODUCTION,
        false,
      ],
      [WorkspaceRole.ADMIN, TaskStatus.DONE, TaskStatus.BRIEF, false],
    ] as const)(
      'role %s: %s → %s = %s',
      (role, from, to, expected) => {
        expect(canTransition(role, from, to)).toBe(expected);
      },
    );
  });

  describe('assertTransition', () => {
    it('throws when from equals to', () => {
      expect(() =>
        assertTransition(
          WorkspaceRole.MANAGER,
          TaskStatus.BRIEF,
          TaskStatus.BRIEF,
        ),
      ).toThrow(TransitionNotAllowedError);
    });

    it('throws for member on any transition', () => {
      expect(() =>
        assertTransition(
          WorkspaceRole.MEMBER,
          TaskStatus.PRODUCTION,
          TaskStatus.INTERNAL_REVIEW,
        ),
      ).toThrow(TransitionNotAllowedError);
    });
  });

  describe('requiresComment', () => {
    it('requires comment only for client_approval → production', () => {
      expect(
        requiresComment(TaskStatus.CLIENT_APPROVAL, TaskStatus.PRODUCTION),
      ).toBe(true);
      expect(
        requiresComment(TaskStatus.CLIENT_APPROVAL, TaskStatus.PENDING_CLOSURE),
      ).toBe(false);
    });
  });

  describe('resolveTransition', () => {
    it('maps client handoff ack', () => {
      expect(
        resolveTransition(
          TaskStatus.CLIENT_HANDOFF,
          TaskStatus.CLIENT_APPROVAL,
        ),
      ).toEqual({
        eventType: TaskEventType.HANDOFF_ACK,
        approvalType: null,
        requiresComment: false,
      });
    });

    it('maps client approve', () => {
      expect(
        resolveTransition(
          TaskStatus.CLIENT_APPROVAL,
          TaskStatus.PENDING_CLOSURE,
        ),
      ).toEqual({
        eventType: TaskEventType.CLIENT_APPROVAL,
        approvalType: ClientApprovalType.APPROVED,
        requiresComment: false,
      });
    });

    it('maps request changes', () => {
      expect(
        resolveTransition(TaskStatus.CLIENT_APPROVAL, TaskStatus.PRODUCTION),
      ).toEqual({
        eventType: TaskEventType.CLIENT_APPROVAL,
        approvalType: ClientApprovalType.CHANGES_REQUESTED,
        requiresComment: true,
      });
    });

    it('maps agency transitions to STATUS_CHANGED', () => {
      expect(
        resolveTransition(TaskStatus.BRIEF, TaskStatus.PRODUCTION),
      ).toEqual({
        eventType: TaskEventType.STATUS_CHANGED,
        approvalType: null,
        requiresComment: false,
      });
    });
  });

  describe('assertTransitionWithPayload', () => {
    it('throws when changes requested without comment', () => {
      expect(() =>
        assertTransitionWithPayload(
          WorkspaceRole.CLIENT_VIEW,
          TaskStatus.CLIENT_APPROVAL,
          TaskStatus.PRODUCTION,
          {},
        ),
      ).toThrow(TransitionValidationError);
    });

    it('accepts changes requested with comment', () => {
      const resolved = assertTransitionWithPayload(
        WorkspaceRole.CLIENT_VIEW,
        TaskStatus.CLIENT_APPROVAL,
        TaskStatus.PRODUCTION,
        { comment: 'Please fix headline' },
      );

      expect(resolved.approvalType).toBe(ClientApprovalType.CHANGES_REQUESTED);
    });
  });

  describe('getAllowedTargetStatuses', () => {
    it('returns empty list from done', () => {
      expect(getAllowedTargetStatuses(WorkspaceRole.ADMIN, TaskStatus.DONE)).toEqual(
        [],
      );
    });

    it('returns client targets on client_handoff', () => {
      expect(
        getAllowedTargetStatuses(
          WorkspaceRole.CLIENT_VIEW,
          TaskStatus.CLIENT_HANDOFF,
        ),
      ).toEqual([TaskStatus.CLIENT_APPROVAL]);
    });

    it('returns agency targets on internal_review', () => {
      expect(
        getAllowedTargetStatuses(
          WorkspaceRole.MANAGER,
          TaskStatus.INTERNAL_REVIEW,
        ).sort(),
      ).toEqual(
        [TaskStatus.PRODUCTION, TaskStatus.CLIENT_HANDOFF].sort(),
      );
    });
  });

  describe('buildAllowedTransitionTargets', () => {
    it('includes UI metadata for client request changes', () => {
      expect(
        buildAllowedTransitionTargets(
          WorkspaceRole.CLIENT_VIEW,
          TaskStatus.CLIENT_APPROVAL,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            to: TaskStatus.PRODUCTION,
            label: 'Request changes',
            requiresComment: true,
            buttonVariant: 'danger',
          }),
        ]),
      );
    });

    it('labels manager transitions', () => {
      expect(
        getTransitionLabel(
          TaskStatus.INTERNAL_REVIEW,
          TaskStatus.CLIENT_HANDOFF,
        ),
      ).toBe('Send to client');
    });
  });
});
