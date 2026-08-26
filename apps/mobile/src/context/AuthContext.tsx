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
import { doctorsService } from '../services/doctors.service';
import {
  completeGoogleLoginFromUrl,
  loginWithGoogle as googleLogin,
} from '../services/google-auth.service';
import { storageService } from '../services/storage.service';
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
  /** Actualiza campos del usuario en memoria y SecureStore. */
  patchUser: (partial: Partial<AuthUser>) => Promise<void>;
  /** Refresca verificationStatus del doctor desde la API. */
  refreshDoctorVerification: () => Promise<string | null>;
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

  const patchUser = useCallback(async (partial: Partial<AuthUser>) => {
    const current = await storageService.getUser();
    if (!current) return;
    const next = { ...current, ...partial };
    await storageService.saveUser(next);
    setUser(next);
  }, []);

  const refreshDoctorVerification = useCallback(async () => {
    const current = await storageService.getUser();
    if (!current || current.role !== 'doctor') return null;
    try {
      const doctor = await doctorsService.getMe();
      const verificationStatus = doctor.verificationStatus;
      const next = { ...current, verificationStatus };
      await storageService.saveUser(next);
      setUser(next);
      return verificationStatus;
    } catch {
      return current.verificationStatus ?? null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      loginWithGoogle,
      registerPatient,
      logout,
      patchUser,
      refreshDoctorVerification,
    }),
    [
      user,
      isLoading,
      login,
      loginWithGoogle,
      registerPatient,
      logout,
      patchUser,
      refreshDoctorVerification,
    ],
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
