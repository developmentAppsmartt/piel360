import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_BRANDING,
  type AppBranding,
} from '../config/branding.defaults';
import { brandingService } from '../services/branding.service';

const BrandingContext = createContext<AppBranding>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<AppBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    brandingService.getBranding().then((next) => {
      if (!cancelled) setBranding(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => branding, [branding]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): AppBranding {
  return useContext(BrandingContext);
}
