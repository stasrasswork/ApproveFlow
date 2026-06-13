/**
 * Task status transition rules (state machine).
 * Source of truth for allowed edges: approveflow-spec.md → «Матрица переходов».
 * MEMBER cannot change status; only ADMIN, MANAGER, and CLIENT_VIEW where listed.
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

/** Allowed (from → to) edges and who may trigger them. No other transitions exist in v1. */
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

/** Role cannot perform this transition (unknown edge or wrong actor). Map to HTTP 403. */
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

/** Transition is allowed but payload is invalid (e.g. missing required comment). Map to HTTP 400. */
export class TransitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionValidationError';
  }
}

export type TransitionPayload = {
  /** Required when client requests changes (client_approval → production). */
  comment?: string;
};

/** Fields to persist on TaskEvent when applying a transition. */
export type ResolvedTransition = {
  eventType: TaskEventType;
  approvalType: ClientApprovalType | null;
  requiresComment: boolean;
};

/** Whether (from → to) exists in the matrix, regardless of role. */
export function isKnownTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITION_RULES.some((r) => r.from === from && r.to === to);
}

export function canTransition(
  role: WorkspaceRole,
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  // Terminal state: no outgoing transitions in v1.
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

/** Spec: mandatory comment only for client «Request changes» (client_approval → production). */
export function requiresComment(from: TaskStatus, to: TaskStatus): boolean {
  return (
    from === TaskStatus.CLIENT_APPROVAL &&
    to === TaskStatus.PRODUCTION
  );
}

/**
 * Maps a validated edge to TaskEvent metadata.
 * Client-specific edges use HANDOFF_ACK / CLIENT_APPROVAL; all others are STATUS_CHANGED.
 */
export function resolveTransition(
  from: TaskStatus,
  to: TaskStatus,
): ResolvedTransition {
  // UI: «Принять к согласованию» — ClientHandoffAck
  if (from === TaskStatus.CLIENT_HANDOFF && to === TaskStatus.CLIENT_APPROVAL) {
    return {
      eventType: TaskEventType.HANDOFF_ACK,
      approvalType: null,
      requiresComment: false,
    };
  }

  // UI: «Согласовать» — approve, closure still needs agency confirmation (pending_closure)
  if (from === TaskStatus.CLIENT_APPROVAL && to === TaskStatus.PENDING_CLOSURE) {
    return {
      eventType: TaskEventType.CLIENT_APPROVAL,
      approvalType: ClientApprovalType.APPROVED,
      requiresComment: false,
    };
  }

  // UI: «Запросить правки» — changes_requested + comment
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

/**
 * Full gate for applying a transition: role matrix + payload rules.
 * Use from the task service before updating Task.status and creating TaskEvent.
 */
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

/** Target statuses for UI action buttons for the given role and current status. */
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
