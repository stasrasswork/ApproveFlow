import { createContext } from 'react';
import type { MeResult, MeWorkspace } from '../api/types';

export const WORKSPACE_STORAGE_KEY = 'approveflow_workspace_id';

export type AuthContextValue = {
  user: MeResult | null;
  loading: boolean;
  activeWorkspace: MeWorkspace | null;
  setActiveWorkspaceId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
