import { StyleSheet } from 'react-native';

export const youcamScoreSummaryStyles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
    alignItems: 'flex-start',
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  tileFooter: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    padding: 16,
    gap: 16,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringScore: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 38,
  },
  ringDenom: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  diffCol: {
    flex: 1,
    gap: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E8EEF5',
    paddingLeft: 14,
  },
  diffPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  diffPillAged: {
    backgroundColor: '#FEF2F2',
  },
  diffPillYoung: {
    backgroundColor: '#ECFDF5',
  },
  diffPillNeutral: {
    backgroundColor: '#F1F5F9',
  },
  diffPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  diffAged: {
    color: '#B91C1C',
  },
  diffYoung: {
    color: '#047857',
  },
  diffNeutral: {
    color: '#64748B',
  },
  diffMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  bandFallback: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EAF3FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  insightIcon: {
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontWeight: '500',
  },
  insightBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
