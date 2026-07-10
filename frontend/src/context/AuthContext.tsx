import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/services/tokenStorage';

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  joining_date: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
};

type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type AcceptInvitePayload = {
  token: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  acceptInvite: (payload: AcceptInvitePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(user: AuthUser): AuthUser {
  return user;
}

async function fetchCurrentUser() {
  const response = await api.get<AuthUser>('/employees/me');
  return normalizeUser(response.data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        if (isMounted) {
          setTokenState(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setTokenState(storedToken);
          setUser(currentUser);
        }
      } catch {
        clearAuthToken();
        if (isMounted) {
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function login({ email, password }: LoginPayload) {
    const formData = new URLSearchParams();
    formData.set('username', email);
    formData.set('password', password);

    const response = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      formData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    setAuthToken(response.data.access_token);
    setTokenState(response.data.access_token);

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function acceptInvite({ token: inviteToken, password }: AcceptInvitePayload) {
    const response = await api.post<{ access_token: string; token_type: string }>('/auth/accept-invite', {
      token: inviteToken,
      password,
    });

    setAuthToken(response.data.access_token);
    setTokenState(response.data.access_token);

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthToken();
      setTokenState(null);
      setUser(null);
    }
  }

  async function refreshUser() {
    const storedToken = getAuthToken();
    if (!storedToken) {
      setTokenState(null);
      setUser(null);
      return null;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setTokenState(storedToken);
      setUser(currentUser);
      return currentUser;
    } catch {
      clearAuthToken();
      setTokenState(null);
      setUser(null);
      return null;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      acceptInvite,
      logout,
      refreshUser,
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
