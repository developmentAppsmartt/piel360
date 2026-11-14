import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

export const analysisResultHeroStyles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...appShadow({ opacity: 0.04, radius: 6, offsetY: 2, elevation: 1 }),
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  patientMeta: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '800',
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stamp: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
