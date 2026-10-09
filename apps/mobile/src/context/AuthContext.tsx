import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState } from 'react-native';
import { isPhoneVerificationSkipped } from '../config/env';
import { authService } from '../services/auth.service';
import { useBrandingSync } from './BrandingContext';
import { doctorsService } from '../services/doctors.service';
import {
  onAccountDisabled,
  onCreditsConsumed,
  onSessionEnded,
  SESSION_REPLACED_MESSAGE,
} from '../services/session-events';
import {
  completeGoogleLoginFromUrl,
  loginWithGoogle as googleLogin,
} from '../services/google-auth.service';
import { storageService } from '../services/storage.service';
import type {
  AccountStatus,
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
  /** `null` mientras no se ha consultado (o sin conexión en el primer intento). */
  accountStatus: AccountStatus | null;
  refreshAccountStatus: () => Promise<AccountStatus | null>;
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
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const syncBranding = useBrandingSync();

  /** Si falla (p. ej. sin conexión) se conserva el último estado conocido. */
  const refreshAccountStatus = useCallback(async () => {
    try {
      const status = await authService.accountStatus();
      setAccountStatus(status);
      return status;
    } catch {
      return null;
    }
  }, []);

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
          await Promise.all([syncPhoneVerification(), refreshAccountStatus()]);
          await reconcilePatientSession();
          return;
        }
        const sessionUser = await authService.hydrateSession();
        if (!cancelled && sessionUser) {
          setUser(sessionUser);
          await Promise.all([syncPhoneVerification(), refreshAccountStatus()]);
          await reconcilePatientSession();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncPhoneVerification, reconcilePatientSession, refreshAccountStatus]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authService.login(payload);
      await refreshAccountStatus();
      setUser(result.user);
      await syncPhoneVerification();
      await reconcilePatientSession();
    },
    [syncPhoneVerification, reconcilePatientSession, refreshAccountStatus],
  );

  const loginWithGoogle = useCallback(async () => {
    const result = await googleLogin();
    await refreshAccountStatus();
    setUser(result.user);
    await syncPhoneVerification();
    await reconcilePatientSession();
  }, [syncPhoneVerification, reconcilePatientSession, refreshAccountStatus]);

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
    setAccountStatus(null);
  }, []);

  useEffect(() => {
    onAccountDisabled(() => void refreshAccountStatus());
    onCreditsConsumed(() => void refreshAccountStatus());
    return () => {
      onAccountDisabled(null);
      onCreditsConsumed(null);
    };
  }, [refreshAccountStatus]);

  // La marca personalizada se hereda del profesional/empresa de la sesión.
  const userId = user?.id;
  useEffect(() => {
    if (userId) void syncBranding();
  }, [userId, syncBranding]);

  // Un admin puede deshabilitar la cuenta, el plan puede vencer o la empresa
  // cambiar su personalización con la app abierta.
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshAccountStatus();
      void syncBranding();
    });
    return () => sub.remove();
  }, [user, refreshAccountStatus, syncBranding]);

  /**
   * La sesión dejó de valer del lado del servidor (otro login la cerró, o
   * venció el refresh): antes la app se quedaba abierta con todas las
   * peticiones fallando en silencio.
   */
  useEffect(() => {
    onSessionEnded((reason) => {
      void (async () => {
        await storageService.clearSession();
        setUser(null);
        setNeedsPhoneVerification(false);
        setAccountStatus(null);
        Alert.alert(
          'Sesión finalizada',
          reason === 'replaced'
            ? SESSION_REPLACED_MESSAGE
            : 'Tu sesión expiró. Inicia sesión de nuevo.',
        );
      })();
    });
    return () => onSessionEnded(null);
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
      accountStatus,
      refreshAccountStatus,
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
      accountStatus,
      refreshAccountStatus,
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
