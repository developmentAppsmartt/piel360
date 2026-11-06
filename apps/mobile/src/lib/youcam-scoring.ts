import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_YOUCAM_SCORE_CONFIG,
  configuredYoucamAdvice,
  configuredYoucamScoreBand,
  type YoucamScoreConfig,
} from '../data/youcamScoreConfig';
import { scoreConfigService } from '../services/score-config.service';
import type { YoucamScoreBand } from '../types/analysis';

let cached: { userId: string; config: YoucamScoreConfig } | null = null;

/** Rangos y textos de la cuenta (por defecto hasta que llegue la respuesta). */
export function useYoucamScoreConfig(): YoucamScoreConfig {
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : null;
  const [config, setConfig] = useState<YoucamScoreConfig>(() =>
    cached && cached.userId === userId
      ? cached.config
      : DEFAULT_YOUCAM_SCORE_CONFIG,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    scoreConfigService
      .getMine()
      .then((next) => {
        cached = { userId, config: next };
        if (!cancelled) setConfig(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return config;
}

export type YoucamScorer = {
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
  const config = useYoucamScoreConfig();
  return useMemo(
    () => ({
      band: (type, score, region) =>
        configuredYoucamScoreBand(score, type, config, region),
      advice: (type, band, regionLabel, region) => {
        const base = configuredYoucamAdvice(type, band, config, region);
        if (!regionLabel || regionLabel === 'General') return base;
        return `${regionLabel}: ${base}`;
      },
    }),
    [config],
  );
}
