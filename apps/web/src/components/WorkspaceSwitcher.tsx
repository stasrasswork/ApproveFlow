import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MeWorkspace } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ROLE_LABELS } from '../lib/roles';
import { Dropdown, type DropdownOption } from './ui/Dropdown';

function workspaceOptions(workspaces: MeWorkspace[]): DropdownOption[] {
  return workspaces.map((workspace) => ({
    value: workspace.id,
    label: workspace.name,
    description: `${workspace.slug} · ${ROLE_LABELS[workspace.role]}`,
  }));
}

export function WorkspaceSwitcher() {
  const { user, activeWorkspace, setActiveWorkspaceId } = useAuth();
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const currentId = workspaceId ?? activeWorkspace?.id ?? '';

  useEffect(() => {
    if (
      workspaceId &&
      user?.workspaces.some((workspace) => workspace.id === workspaceId)
    ) {
      setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId, user, setActiveWorkspaceId]);

  const options = useMemo(
    () => (user ? workspaceOptions(user.workspaces) : []),
    [user],
  );

  if (!user || user.workspaces.length === 0) {
    return null;
  }

  return (
    <Dropdown
      value={currentId}
      onChange={(id) => {
        setActiveWorkspaceId(id);
        navigate(`/w/${id}/projects`);
      }}
      options={options}
      placeholder="Select workspace"
      size="md"
      compactTrigger
      className="w-full min-w-0 sm:min-w-[220px] sm:max-w-[280px]"
      triggerClassName="border-brand-100/80 bg-white/90"
    />
  );
}
