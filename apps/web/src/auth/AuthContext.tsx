import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/endpoints';
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from '../api/client';
import type { MeResult, MeWorkspace } from '../api/types';

const WORKSPACE_KEY = 'approveflow_workspace_id';

type AuthContextValue = {
  user: MeResult | null;
  loading: boolean;
  activeWorkspace: MeWorkspace | null;
  setActiveWorkspaceId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(WORKSPACE_KEY),
  );

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);

    if (me.workspaces.length === 0) {
      setActiveWorkspaceIdState(null);
      localStorage.removeItem(WORKSPACE_KEY);
      return;
    }

    const stored = localStorage.getItem(WORKSPACE_KEY);
    const valid = me.workspaces.find((w) => w.id === stored);
    const next = valid ?? me.workspaces[0];
    setActiveWorkspaceIdState(next.id);
    localStorage.setItem(WORKSPACE_KEY, next.id);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email, password);
      setTokens(tokens);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setActiveWorkspaceIdState(null);
    localStorage.removeItem(WORKSPACE_KEY);
  }, []);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(WORKSPACE_KEY, id);
  }, []);

  const activeWorkspace = useMemo(() => {
    if (!user || !activeWorkspaceId) {
      return null;
    }
    return user.workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  }, [user, activeWorkspaceId]);

  const value = useMemo(
    () => ({
      user,
      loading,
      activeWorkspace,
      setActiveWorkspaceId,
      login,
      logout,
      refreshUser,
    }),
    [
      user,
      loading,
      activeWorkspace,
      setActiveWorkspaceId,
      login,
      logout,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
