import { Button } from '../ui/Button';

type MemberRowActionsProps = {
  canRemove: boolean;
  isCurrentUser: boolean;
  removePending: boolean;
  onRemove: () => void;
  layout?: 'table' | 'card';
};

export function MemberRowActions({
  canRemove,
  isCurrentUser,
  removePending,
  onRemove,
  layout = 'table',
}: MemberRowActionsProps) {
  if (!canRemove || isCurrentUser) {
    return layout === 'table' ? null : null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="text-rose-600 hover:text-rose-700"
      disabled={removePending}
      onClick={onRemove}
    >
      Remove
    </Button>
  );
}
