import { ConfirmDialog } from './ui/ConfirmDialog';

type MemberRemoveDialogProps = {
  member: { userId: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  scope?: 'project' | 'workspace';
};

export function MemberRemoveDialog({
  member,
  onClose,
  onConfirm,
  isPending = false,
  scope = 'project',
}: MemberRemoveDialogProps) {
  return (
    <ConfirmDialog
      open={Boolean(member)}
      title={`Remove from ${scope}?`}
      description={
        member
          ? `Remove ${member.name} from this ${scope}? They will lose access.`
          : ''
      }
      confirmLabel="Remove"
      variant="danger"
      loading={isPending}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
