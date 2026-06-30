export function getEventTypeLabel(
  eventType: string,
  approvalType: string | null,
): string | null {
  if (eventType === 'HANDOFF_ACK') {
    return 'Client accepted for review';
  }

  if (eventType === 'CLIENT_APPROVAL') {
    if (approvalType === 'APPROVED') {
      return 'Client approved';
    }
    if (approvalType === 'CHANGES_REQUESTED') {
      return 'Client requested changes';
    }
  }

  return null;
}
