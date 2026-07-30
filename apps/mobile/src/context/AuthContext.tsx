import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import {
  completeGoogleLoginFromUrl,
  loginWithGoogle as googleLogin,
} from '../services/google-auth.service';
import type {
  AuthUser,
  LoginPayload,
  RegisterPatientPayload,
  Role,
} from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (
    role?: Extract<Role, 'patient' | 'doctor'>,
  ) => Promise<void>;
  registerPatient: (payload: RegisterPatientPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Vuelta de OAuth en Expo Web (?code=...).
        const fromGoogle = await completeGoogleLoginFromUrl();
        if (fromGoogle && !cancelled) {
          setUser(fromGoogle.user);
          return;
        }
        const sessionUser = await authService.hydrateSession();
        if (!cancelled) setUser(sessionUser);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authService.login(payload);
    setUser(result.user);
  }, []);

  const loginWithGoogle = useCallback(
    async (role: Extract<Role, 'patient' | 'doctor'> = 'patient') => {
      const result = await googleLogin(role);
      setUser(result.user);
    },
    [],
  );

  const registerPatient = useCallback(
    async (payload: RegisterPatientPayload) => {
      const result = await authService.registerPatient(payload);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      loginWithGoogle,
      registerPatient,
      logout,
    }),
    [user, isLoading, login, loginWithGoogle, registerPatient, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
