import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';

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

type ResetPasswordPayload = {
  token: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  acceptInvite: (payload: AcceptInvitePayload) => Promise<AuthUser>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser() {
  const response = await api.get<AuthUser>('/employees/me');
  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
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

  async function login({ email, password, rememberMe }: LoginPayload) {
    const formData = new URLSearchParams();
    formData.set('username', email);
    formData.set('password', password);
    if (rememberMe) {
      formData.set('scope', 'remember_me');
    }

    await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function acceptInvite({ token: inviteToken, password }: AcceptInvitePayload) {
    await api.post('/auth/accept-invite', {
      token: inviteToken,
      password,
    });

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function forgotPassword(email: string) {
    await api.post('/auth/forgot-password', { email });
  }

  async function resetPassword({ token: resetToken, password }: ResetPasswordPayload) {
    await api.post('/auth/reset-password', {
      token: resetToken,
      password,
    });

    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }

  async function refreshUser() {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      acceptInvite,
      forgotPassword,
      resetPassword,
      logout,
      refreshUser,
    }),
    [isLoading, user],
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
