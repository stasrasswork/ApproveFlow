/**
 * Task status transition rules (state machine).
 * Source of truth: approveflow-spec.md → «Матрица переходов».
 */

import {
  ClientApprovalType,
  TaskEventType,
  TaskStatus,
  WorkspaceRole,
} from '../../generated/prisma/client.js';
import { AGENCY_ROLES } from '../../common/index.js';

type TransitionRule = {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: WorkspaceRole[];
};

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: TaskStatus.BRIEF,
    to: TaskStatus.PRODUCTION,
    allowedRoles: AGENCY_ROLES,
  },
  {
    from: TaskStatus.PRODUCTION,
    to: TaskStatus.INTERNAL_REVIEW,
    allowedRoles: AGENCY_ROLES,
  },
  {
    from: TaskStatus.INTERNAL_REVIEW,
    to: TaskStatus.PRODUCTION,
    allowedRoles: AGENCY_ROLES,
  },
  {
    from: TaskStatus.INTERNAL_REVIEW,
    to: TaskStatus.CLIENT_HANDOFF,
    allowedRoles: AGENCY_ROLES,
  },
  {
    from: TaskStatus.CLIENT_HANDOFF,
    to: TaskStatus.INTERNAL_REVIEW,
    allowedRoles: AGENCY_ROLES,
  },
  {
    from: TaskStatus.CLIENT_HANDOFF,
    to: TaskStatus.CLIENT_APPROVAL,
    allowedRoles: [WorkspaceRole.CLIENT_VIEW],
  },
  {
    from: TaskStatus.CLIENT_APPROVAL,
    to: TaskStatus.PENDING_CLOSURE,
    allowedRoles: [WorkspaceRole.CLIENT_VIEW],
  },
  {
    from: TaskStatus.CLIENT_APPROVAL,
    to: TaskStatus.PRODUCTION,
    allowedRoles: [WorkspaceRole.CLIENT_VIEW],
  },
  {
    from: TaskStatus.PENDING_CLOSURE,
    to: TaskStatus.DONE,
    allowedRoles: AGENCY_ROLES,
  },
];

export class TransitionNotAllowedError extends Error {
  constructor(
    public readonly role: WorkspaceRole,
    public readonly from: TaskStatus,
    public readonly to: TaskStatus,
  ) {
    super(
      `Transition ${from} → ${to} is not allowed for role ${role}`,
    );
    this.name = 'TransitionNotAllowedError';
  }
}

export class TransitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionValidationError';
  }
}

export type TransitionPayload = {
  comment?: string;
};

export type ResolvedTransition = {
  eventType: TaskEventType;
  approvalType: ClientApprovalType | null;
  requiresComment: boolean;
};

export function isKnownTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITION_RULES.some((r) => r.from === from && r.to === to);
}

export function canTransition(
  role: WorkspaceRole,
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  if (from === TaskStatus.DONE) {
    return false;
  }

  const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to);
  if (!rule) {
    return false;
  }

  return rule.allowedRoles.includes(role);
}

export function assertTransition(
  role: WorkspaceRole,
  from: TaskStatus,
  to: TaskStatus,
): void {
  if (from === to) {
    throw new TransitionNotAllowedError(role, from, to);
  }

  if (!canTransition(role, from, to)) {
    throw new TransitionNotAllowedError(role, from, to);
  }
}

export function requiresComment(from: TaskStatus, to: TaskStatus): boolean {
  return (
    from === TaskStatus.CLIENT_APPROVAL &&
    to === TaskStatus.PRODUCTION
  );
}

export function resolveTransition(
  from: TaskStatus,
  to: TaskStatus,
): ResolvedTransition {
  if (from === TaskStatus.CLIENT_HANDOFF && to === TaskStatus.CLIENT_APPROVAL) {
    return {
      eventType: TaskEventType.HANDOFF_ACK,
      approvalType: null,
      requiresComment: false,
    };
  }

  if (from === TaskStatus.CLIENT_APPROVAL && to === TaskStatus.PENDING_CLOSURE) {
    return {
      eventType: TaskEventType.CLIENT_APPROVAL,
      approvalType: ClientApprovalType.APPROVED,
      requiresComment: false,
    };
  }

  if (from === TaskStatus.CLIENT_APPROVAL && to === TaskStatus.PRODUCTION) {
    return {
      eventType: TaskEventType.CLIENT_APPROVAL,
      approvalType: ClientApprovalType.CHANGES_REQUESTED,
      requiresComment: true,
    };
  }

  return {
    eventType: TaskEventType.STATUS_CHANGED,
    approvalType: null,
    requiresComment: false,
  };
}

export function assertTransitionWithPayload(
  role: WorkspaceRole,
  from: TaskStatus,
  to: TaskStatus,
  payload: TransitionPayload = {},
): ResolvedTransition {
  assertTransition(role, from, to);

  const resolved = resolveTransition(from, to);

  if (resolved.requiresComment) {
    const comment = payload.comment?.trim();
    if (!comment) {
      throw new TransitionValidationError(
        'Comment is required when requesting changes (client_approval → production)',
      );
    }
  }

  return resolved;
}

export function getAllowedTargetStatuses(
  role: WorkspaceRole,
  from: TaskStatus,
): TaskStatus[] {
  if (from === TaskStatus.DONE) {
    return [];
  }

  return TRANSITION_RULES.filter(
    (r) => r.from === from && r.allowedRoles.includes(role),
  ).map((r) => r.to);
}

export type TransitionButtonVariant = 'primary' | 'danger' | 'secondary';

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BRIEF]: 'Brief',
  [TaskStatus.PRODUCTION]: 'In progress',
  [TaskStatus.INTERNAL_REVIEW]: 'Internal review',
  [TaskStatus.CLIENT_HANDOFF]: 'Awaiting client',
  [TaskStatus.CLIENT_APPROVAL]: 'Client approval',
  [TaskStatus.PENDING_CLOSURE]: 'Pending closure',
  [TaskStatus.DONE]: 'Done',
};

const TRANSITION_LABELS: Partial<
  Record<TaskStatus, Partial<Record<TaskStatus, string>>>
> = {
  [TaskStatus.BRIEF]: { [TaskStatus.PRODUCTION]: 'Start work' },
  [TaskStatus.PRODUCTION]: {
    [TaskStatus.INTERNAL_REVIEW]: 'Send to internal review',
  },
  [TaskStatus.INTERNAL_REVIEW]: {
    [TaskStatus.PRODUCTION]: 'Request revisions',
    [TaskStatus.CLIENT_HANDOFF]: 'Send to client',
  },
  [TaskStatus.CLIENT_HANDOFF]: {
    [TaskStatus.INTERNAL_REVIEW]: 'Recall',
    [TaskStatus.CLIENT_APPROVAL]: 'Accept for review',
  },
  [TaskStatus.CLIENT_APPROVAL]: {
    [TaskStatus.PENDING_CLOSURE]: 'Approve',
    [TaskStatus.PRODUCTION]: 'Request changes',
  },
  [TaskStatus.PENDING_CLOSURE]: { [TaskStatus.DONE]: 'Confirm closure' },
};

export function getTransitionLabel(from: TaskStatus, to: TaskStatus): string {
  return (
    TRANSITION_LABELS[from]?.[to] ??
    `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`
  );
}

export function getTransitionButtonVariant(
  from: TaskStatus,
  to: TaskStatus,
): TransitionButtonVariant {
  if (from === TaskStatus.CLIENT_APPROVAL && to === TaskStatus.PRODUCTION) {
    return 'danger';
  }
  if (to === TaskStatus.DONE || to === TaskStatus.PENDING_CLOSURE) {
    return 'primary';
  }
  return 'secondary';
}

export type AllowedTransitionTarget = {
  to: TaskStatus;
  label: string;
  requiresComment: boolean;
  buttonVariant: TransitionButtonVariant;
};

export function buildAllowedTransitionTargets(
  role: WorkspaceRole,
  from: TaskStatus,
): AllowedTransitionTarget[] {
  return getAllowedTargetStatuses(role, from).map((to) => ({
    to,
    label: getTransitionLabel(from, to),
    requiresComment: requiresComment(from, to),
    buttonVariant: getTransitionButtonVariant(from, to),
  }));
}
