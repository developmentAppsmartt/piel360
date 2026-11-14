import { StyleSheet, Text, View } from 'react-native';
import type { RangosPuntaje } from '../../../data/youcamScoreConfig';

/** Mismos tonos que la personalización del panel (rosa, ámbar, verde). */
const COLOR = {
  regular: '#FB7185',
  promedio: '#FBBF24',
  buena: '#10B981',
} as const;

const MARCAS = [0, 20, 40, 60, 80, 100];

type ScoreRangeBarProps = {
  score: number;
  ranges: RangosPuntaje;
  /** Sin leyenda: cabe en la tarjeta de cada métrica. */
  compact?: boolean;
};

/** Barra 0–100 de la puntuación general. Los cortes salen de la
 * personalización; las marcas de arriba son fijas para leer el puntaje. */
export function ScoreRangeBar({ score, ranges, compact = false }: ScoreRangeBarProps) {
  const value = Math.max(0, Math.min(100, score));
  const { regularMax, promedioMax } = ranges;
  const promedioAncho = Math.max(0, promedioMax - regularMax);
  const buenaAncho = Math.max(0, 100 - promedioMax);
  const color =
    value < regularMax
      ? COLOR.regular
      : value < promedioMax
        ? COLOR.promedio
        : COLOR.buena;

  const leyenda = [
    { color: COLOR.regular, rango: `0-${regularMax - 1}`, label: 'Regular' },
    {
      color: COLOR.promedio,
      rango: `${regularMax}-${promedioMax - 1}`,
      label: 'Promedio',
    },
    { color: COLOR.buena, rango: `${promedioMax}-100`, label: 'Buena' },
  ];

  return (
    <View style={[styles.block, compact ? styles.blockCompact : null]}>
      <View style={[styles.marcas, compact ? styles.marcasCompact : null]}>
        {MARCAS.map((marca) => (
          <Text
            key={marca}
            style={[
              styles.marca,
              {
                left: `${marca}%`,
                transform: [
                  { translateX: marca === 0 ? 0 : marca === 100 ? -18 : -8 },
                ],
              },
            ]}
          >
            {marca}
          </Text>
        ))}
      </View>

      <View style={[styles.pistaWrap, compact ? styles.pistaWrapCompact : null]}>
        <View style={[styles.pista, compact ? styles.pistaCompact : null]}>
          <View style={{ flex: regularMax, backgroundColor: COLOR.regular }} />
          <View style={{ flex: promedioAncho, backgroundColor: COLOR.promedio }} />
          <View style={{ flex: buenaAncho, backgroundColor: COLOR.buena }} />
        </View>
        <View
          style={[
            styles.pin,
            compact ? styles.pinCompact : null,
            { left: `${value}%`, backgroundColor: color },
          ]}
        >
          <Text
            style={[
              styles.pinText,
              color === COLOR.promedio ? styles.pinTextDark : null,
            ]}
          >
            {Math.round(value)}
          </Text>
        </View>
      </View>

      <View style={styles.cortes}>
        <Text
          style={[
            styles.corte,
            { left: `${regularMax}%`, color: COLOR.promedio },
          ]}
        >
          {regularMax}
        </Text>
        <Text
          style={[
            styles.corte,
            { left: `${promedioMax}%`, color: COLOR.buena },
          ]}
        >
          {promedioMax}
        </Text>
      </View>

      {compact ? null : (
      <View style={styles.leyenda}>
        {leyenda.map((item) => (
          <View key={item.label} style={styles.leyendaFila}>
            <View style={[styles.muestra, { backgroundColor: item.color }]} />
            <Text style={[styles.leyendaRango, { color: item.color }]}>
              {item.rango}
            </Text>
            <Text style={styles.leyendaLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  blockCompact: {
    marginTop: 2,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  marcasCompact: {
    height: 14,
  },
  pistaWrapCompact: {
    height: 24,
  },
  pistaCompact: {
    height: 10,
  },
  pinCompact: {
    top: 1,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
  },
  marcas: {
    height: 16,
    position: 'relative',
    marginBottom: 2,
  },
  marca: {
    position: 'absolute',
    top: 0,
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  pistaWrap: {
    height: 28,
    justifyContent: 'center',
  },
  pista: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    top: 1,
    width: 26,
    height: 26,
    marginLeft: -13,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pinTextDark: {
    color: '#78350F',
  },
  cortes: {
    height: 16,
    position: 'relative',
    marginTop: 2,
  },
  corte: {
    position: 'absolute',
    top: 0,
    marginLeft: -8,
    fontSize: 10,
    fontWeight: '700',
  },
  leyenda: {
    marginTop: 6,
    gap: 4,
  },
  leyendaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muestra: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  leyendaRango: {
    width: 52,
    fontSize: 12,
    fontWeight: '700',
  },
  leyendaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
});
