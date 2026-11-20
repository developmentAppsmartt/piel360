import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_YOUCAM_SCORE_CONFIG,
  configuredYoucamAdvice,
  configuredYoucamScoreBand,
  normalizeYoucamScoreConfig,
  type YoucamScoreConfig,
} from '../data/youcamScoreConfig';
import { scoreConfigService } from '../services/score-config.service';
import type { YoucamScoreBand } from '../types/analysis';

let cached: { userId: string; config: YoucamScoreConfig; at: number } | null =
  null;

/** Tras editar rangos en el CRM, forzar recarga en la app. */
export function invalidateYoucamScoreConfigCache(): void {
  cached = null;
}

type ScoreConfigState = {
  config: YoucamScoreConfig;
  reload: () => void;
};

/**
 * Rangos y textos de la cuenta. Siempre vuelve a pedir al montar y al volver
 * la app a primer plano: si el doctor cambió textos en el CRM, el cache no
 * debe pegarse al análisis.
 */
export function useYoucamScoreConfig(): ScoreConfigState {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : null;
  const [config, setConfig] = useState<YoucamScoreConfig>(() =>
    cached && cached.userId === userId
      ? cached.config
      : DEFAULT_YOUCAM_SCORE_CONFIG,
  );
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchConfig = useCallback((uid: string) => {
    let cancelled = false;
    scoreConfigService
      .getMine()
      .then((raw) => {
        const next = normalizeYoucamScoreConfig(raw);
        cached = { userId: uid, config: next, at: Date.now() };
        if (!cancelled && userIdRef.current === uid) setConfig(next);
      })
      .catch(() => {
        // Sin red: se conserva lo cacheado o el default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => {
    if (!userId) return;
    invalidateYoucamScoreConfigCache();
    fetchConfig(userId);
  }, [userId, fetchConfig]);

  useEffect(() => {
    if (!userId) {
      setConfig(DEFAULT_YOUCAM_SCORE_CONFIG);
      return;
    }
    return fetchConfig(userId);
  }, [userId, fetchConfig]);

  useEffect(() => {
    if (!userId) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') fetchConfig(userId);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [userId, fetchConfig]);

  return { config, reload };
}

export type YoucamScorer = {
  /** Rangos y textos de GET /auth/me/score-config. */
  config: YoucamScoreConfig;
  /** Vuelve a pedir la personalización al API. */
  reload: () => void;
  /** `region`: zona de Arrugas o Poros, que puede tener rangos propios. */
  band: (
    type: string | null | undefined,
    score: number,
    region?: string | null,
  ) => YoucamScoreBand;
  advice: (
    type: string | null | undefined,
    band: YoucamScoreBand,
    regionLabel?: string | null,
    region?: string | null,
  ) => string;
};

export function useYoucamScorer(): YoucamScorer {
  const { config, reload } = useYoucamScoreConfig();

  return useMemo(
    () => ({
      config,
      reload,
      band: (type, score, region) =>
        configuredYoucamScoreBand(score, type, config, region),
      advice: (type, band, regionLabel, region) => {
        const base = configuredYoucamAdvice(type, band, config, region);
        if (!regionLabel || regionLabel === 'General') return base;
        return `${regionLabel}: ${base}`;
      },
    }),
    [config, reload],
  );
}
