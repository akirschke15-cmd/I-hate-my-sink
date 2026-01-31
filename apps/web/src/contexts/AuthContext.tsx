import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { cacheAuth, getCachedAuth, clearAuthCache } from '../lib/offline-store';
import type { UserProfile, AuthTokens } from '@ihms/shared';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyId: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  // Initialize auth state from localStorage or IndexedDB
  useEffect(() => {
    async function initAuth() {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const cachedUserStr = localStorage.getItem('user');

        if (accessToken && refreshToken && cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr) as UserProfile;
          setUser(cachedUser);
        } else {
          // Try IndexedDB for offline auth
          const cached = await getCachedAuth();
          if (cached && cached.expiresAt > Date.now()) {
            localStorage.setItem('accessToken', cached.accessToken);
            localStorage.setItem('refreshToken', cached.refreshToken);
            localStorage.setItem('user', JSON.stringify(cached.user));
            setUser(cached.user as UserProfile);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const saveAuthData = useCallback(async (tokens: AuthTokens, userProfile: UserProfile) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(userProfile));

    // Also cache in IndexedDB for offline access
    await cacheAuth({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    setUser(userProfile);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });
      await saveAuthData(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
        result.user
      );
      navigate('/dashboard');
    },
    [loginMutation, saveAuthData, navigate]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      companyId: string;
    }) => {
      const result = await registerMutation.mutateAsync(data);
      await saveAuthData(
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
        result.user
      );
      navigate('/dashboard');
    },
    [registerMutation, saveAuthData, navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearAuthCache();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
