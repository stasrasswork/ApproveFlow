import type { UserBrief, WorkspaceRole } from '../../api/types';
import { userDisplayName } from '../../lib/format';
import { ROLE_LABELS } from '../../lib/roles';

const ROLE_BADGE_COLORS: Record<WorkspaceRole, string> = {
  ADMIN: 'bg-brand-50 text-brand-700 ring-brand-100',
  MANAGER: 'bg-violet-50 text-violet-700 ring-violet-100',
  MEMBER: 'bg-slate-100 text-slate-600 ring-slate-200',
  CLIENT_VIEW: 'bg-amber-50 text-amber-800 ring-amber-100',
};

export function RoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE_COLORS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function AuthorLine({
  author,
  role,
  timestamp,
}: {
  author: UserBrief;
  role: WorkspaceRole;
  timestamp: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm font-semibold text-slate-900">
        {userDisplayName(author)}
      </span>
      <RoleBadge role={role} />
      <span className="text-xs text-slate-400">{timestamp}</span>
    </div>
  );
}
