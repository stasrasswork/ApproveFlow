import { describe, expect, it } from 'vitest';
import { roleForWorkspace } from '../lib/route-workspace-role';
import { isAgencyRole } from '../lib/roles';
import type { MeResult } from '../api/types';

const managerUser: MeResult = {
  id: 'u-manager',
  email: 'manager@test.local',
  name: 'Manager',
  workspaces: [
    { id: 'ws-a', name: 'Workspace A', slug: 'ws-a', role: 'MANAGER' },
    { id: 'ws-b', name: 'Workspace B', slug: 'ws-b', role: 'MEMBER' },
  ],
};

const clientUser: MeResult = {
  id: 'u-client',
  email: 'client@test.local',
  name: 'Client',
  workspaces: [
    { id: 'ws-a', name: 'Workspace A', slug: 'ws-a', role: 'CLIENT_VIEW' },
  ],
};

describe('page role gating helpers', () => {
  it('uses route workspace role for deep-linked manager pages', () => {
    expect(roleForWorkspace(managerUser, 'ws-a')).toBe('MANAGER');
    expect(isAgencyRole(roleForWorkspace(managerUser, 'ws-a')!)).toBe(true);
  });

  it('downgrades manager to member capabilities on another workspace route', () => {
    expect(roleForWorkspace(managerUser, 'ws-b')).toBe('MEMBER');
    expect(isAgencyRole(roleForWorkspace(managerUser, 'ws-b')!)).toBe(false);
  });

  it('treats client viewers as non-agency on project routes', () => {
    expect(roleForWorkspace(clientUser, 'ws-a')).toBe('CLIENT_VIEW');
    expect(isAgencyRole(roleForWorkspace(clientUser, 'ws-a')!)).toBe(false);
  });
});
