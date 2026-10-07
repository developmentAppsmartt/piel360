import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  DEFAULT_BRANDING,
  type AppBranding,
} from '../config/branding.defaults';
import {
  brandingService,
  toAppBranding,
  type RemoteBranding,
} from '../services/branding.service';

const BrandingContext = createContext<AppBranding>(DEFAULT_BRANDING);
const BrandingSyncContext = createContext<() => Promise<void>>(async () => {});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<RemoteBranding | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await brandingService.readCache();
      if (cancelled) return;
      if (cached) setRemote(cached);
      const fresh = await brandingService.refreshCached();
      if (!cancelled && fresh) setRemote(fresh);
    })();
    // Sin sesión (login/registro) también toma los cambios hechos en el CRM.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void brandingService.refreshCached().then((fresh) => {
        if (!cancelled && fresh) setRemote(fresh);
      });
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const syncForSession = useCallback(async () => {
    try {
      setRemote(await brandingService.fetchForSession());
    } catch {
      // Se mantiene el branding cacheado.
    }
  }, []);

  const branding = useMemo(() => toAppBranding(remote), [remote]);

  return (
    <BrandingSyncContext.Provider value={syncForSession}>
      <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
    </BrandingSyncContext.Provider>
  );
}

export function useBranding(): AppBranding {
  return useContext(BrandingContext);
}

/** Vuelve a pedir el branding del usuario autenticado y actualiza la caché. */
export function useBrandingSync(): () => Promise<void> {
  return useContext(BrandingSyncContext);
}
