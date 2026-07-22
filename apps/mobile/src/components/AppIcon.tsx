import { Iconify } from 'react-native-iconify';
import type { AppIconName } from './icons';

type AppIconProps = {
  icon: AppIconName;
  size?: number;
  color?: string;
};

/** Wrapper tipado sobre Iconify para la app. */
export function AppIcon({ icon, size = 22, color = '#6B7280' }: AppIconProps) {
  return <Iconify icon={icon} size={size} color={color} />;
}
