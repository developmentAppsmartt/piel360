import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isPhoneVerificationSkipped } from '../config/env';
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
} from '../types/auth';
import { isClinicalPanelUser } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  needsPhoneVerification: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerPatient: (payload: RegisterPatientPayload) => Promise<void>;
  logout: () => Promise<void>;
  completePhoneVerification: () => void;
  patchUser: (partial: Partial<AuthUser>) => Promise<void>;
  refreshDoctorVerification: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveNeedsPhoneVerification(): Promise<boolean> {
  if (isPhoneVerificationSkipped()) return false;
  try {
    const me = await authService.meDetails();
    return !me.phoneVerifiedAt;
  } catch {
    return false;
  }
}

function asPatientUser(current: AuthUser): AuthUser {
  return {
    ...current,
    role: 'patient',
    empresa: undefined,
    empresaReferida: undefined,
    verificationStatus: undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);

  const syncPhoneVerification = useCallback(async () => {
    const needs = await resolveNeedsPhoneVerification();
    setNeedsPhoneVerification(needs);
    return needs;
  }, []);

  /**
   * Si la sesión/JWT dice doctor pero en BD solo hay paciente, corrige el
   * usuario local y intenta renovar el token (cuando el API ya resuelve bien el rol).
   */
  const reconcilePatientSession = useCallback(async () => {
    const current = await storageService.getUser();
    if (!current) return;
    try {
      const details = await authService.meDetails();
      if (!(details.patient && !details.doctor)) return;

      if (isClinicalPanelUser(current)) {
        const refreshed = await authService.refreshSession();
        if (refreshed && !isClinicalPanelUser(refreshed.user)) {
          setUser(refreshed.user);
          return;
        }
        const next = asPatientUser(current);
        await storageService.saveUser(next);
        setUser(next);
      }
    } catch {
      // Si /auth/me falla, no tocamos la sesión.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromGoogle = await completeGoogleLoginFromUrl();
        if (fromGoogle && !cancelled) {
          setUser(fromGoogle.user);
          await syncPhoneVerification();
          await reconcilePatientSession();
          return;
        }
        const sessionUser = await authService.hydrateSession();
        if (!cancelled && sessionUser) {
          setUser(sessionUser);
          await syncPhoneVerification();
          await reconcilePatientSession();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncPhoneVerification, reconcilePatientSession]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authService.login(payload);
      setUser(result.user);
      await syncPhoneVerification();
      await reconcilePatientSession();
    },
    [syncPhoneVerification, reconcilePatientSession],
  );

  const loginWithGoogle = useCallback(async () => {
    const result = await googleLogin();
    setUser(result.user);
    await syncPhoneVerification();
    await reconcilePatientSession();
  }, [syncPhoneVerification, reconcilePatientSession]);

  const registerPatient = useCallback(
    async (payload: RegisterPatientPayload) => {
      const result = await authService.registerPatient(payload);
      setUser(result.user);
      setNeedsPhoneVerification(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setNeedsPhoneVerification(false);
  }, []);

  const completePhoneVerification = useCallback(() => {
    setNeedsPhoneVerification(false);
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
    if (!current || !isClinicalPanelUser(current)) return null;
    try {
      const details = await authService.meDetails();
      if (details.patient && !details.doctor) {
        await reconcilePatientSession();
        return null;
      }
      if (!details.doctor) {
        await reconcilePatientSession();
        return null;
      }
      const doctor = await doctorsService.getMe();
      const verificationStatus = doctor.verificationStatus;
      const next = { ...current, verificationStatus };
      await storageService.saveUser(next);
      setUser(next);
      return verificationStatus;
    } catch {
      await reconcilePatientSession();
      return null;
    }
  }, [reconcilePatientSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      needsPhoneVerification,
      login,
      loginWithGoogle,
      registerPatient,
      logout,
      completePhoneVerification,
      patchUser,
      refreshDoctorVerification,
    }),
    [
      user,
      isLoading,
      needsPhoneVerification,
      login,
      loginWithGoogle,
      registerPatient,
      logout,
      completePhoneVerification,
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
