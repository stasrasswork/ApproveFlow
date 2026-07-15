import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/endpoints';
import type { MeResult } from '../api/types';
import {
  AuthContext,
  WORKSPACE_STORAGE_KEY,
  type AuthContextValue,
} from './auth-context';

function pickActiveWorkspaceId(me: MeResult): string | null {
  if (me.workspaces.length === 0) {
    return null;
  }

  const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  const valid = me.workspaces.find((w) => w.id === stored);
  return (valid ?? me.workspaces[0]).id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY),
  );

  const applyMe = useCallback((me: MeResult) => {
    setUser(me);

    const nextWorkspaceId = pickActiveWorkspaceId(me);
    setActiveWorkspaceIdState(nextWorkspaceId);

    if (nextWorkspaceId) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, nextWorkspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    applyMe(me);
  }, [applyMe]);

  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((me) => {
        if (!cancelled) {
          applyMe(me);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setActiveWorkspaceIdState(null);
          localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        await authApi.login(email, password);
        await refreshUser();
      } finally {
        setLoading(false);
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local session is cleared even when revocation fails.
    } finally {
      setUser(null);
      setActiveWorkspaceIdState(null);
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
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
